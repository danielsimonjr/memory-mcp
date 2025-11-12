#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define memory file path using environment variable with fallback
export const defaultMemoryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'memory.jsonl');

// Handle backward compatibility: migrate memory.json to memory.jsonl if needed
export async function ensureMemoryFilePath(): Promise<string> {
  if (process.env.MEMORY_FILE_PATH) {
    // Custom path provided, use it as-is (with absolute path resolution)
    return path.isAbsolute(process.env.MEMORY_FILE_PATH)
      ? process.env.MEMORY_FILE_PATH
      : path.join(path.dirname(fileURLToPath(import.meta.url)), process.env.MEMORY_FILE_PATH);
  }
  
  // No custom path set, check for backward compatibility migration
  const oldMemoryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'memory.json');
  const newMemoryPath = defaultMemoryPath;
  
  try {
    // Check if old file exists and new file doesn't
    await fs.access(oldMemoryPath);
    try {
      await fs.access(newMemoryPath);
      // Both files exist, use new one (no migration needed)
      return newMemoryPath;
    } catch {
      // Old file exists, new file doesn't - migrate
      console.error('DETECTED: Found legacy memory.json file, migrating to memory.jsonl for JSONL format compatibility');
      await fs.rename(oldMemoryPath, newMemoryPath);
      console.error('COMPLETED: Successfully migrated memory.json to memory.jsonl');
      return newMemoryPath;
    }
  } catch {
    // Old file doesn't exist, use new path
    return newMemoryPath;
  }
}

// Initialize memory file path (will be set during startup)
let MEMORY_FILE_PATH: string;

// We are storing our memory using entities, relations, and observations in a graph structure
export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
  createdAt?: string;
  lastModified?: string;
  tags?: string[];
  importance?: number;
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
  createdAt?: string;
  lastModified?: string;
}

export interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

export interface GraphStats {
  totalEntities: number;
  totalRelations: number;
  entityTypesCounts: Record<string, number>;
  relationTypesCounts: Record<string, number>;
  oldestEntity?: { name: string; date: string };
  newestEntity?: { name: string; date: string };
  oldestRelation?: { from: string; to: string; relationType: string; date: string };
  newestRelation?: { from: string; to: string; relationType: string; date: string };
  entityDateRange?: { earliest: string; latest: string };
  relationDateRange?: { earliest: string; latest: string };
}

// The KnowledgeGraphManager class contains all operations to interact with the knowledge graph
export class KnowledgeGraphManager {
  constructor(private memoryFilePath: string) {}

  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(this.memoryFilePath, "utf-8");
      const lines = data.split("\n").filter(line => line.trim() !== "");
      return lines.reduce((graph: KnowledgeGraph, line) => {
        const item = JSON.parse(line);
        if (item.type === "entity") {
        // Add createdAt if missing for backward compatibility
        if (!item.createdAt) item.createdAt = new Date().toISOString();
        // Add lastModified if missing for backward compatibility
        if (!item.lastModified) item.lastModified = item.createdAt;
        // Phase 3: Backward compatibility for tags and importance
        // These fields are optional and will be undefined if not present
        graph.entities.push(item as Entity);
      }
        if (item.type === "relation") {
        // Add createdAt if missing for backward compatibility
        if (!item.createdAt) item.createdAt = new Date().toISOString();
        // Add lastModified if missing for backward compatibility
        if (!item.lastModified) item.lastModified = item.createdAt;
        graph.relations.push(item as Relation);
      }
        return graph;
      }, { entities: [], relations: [] });
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === "ENOENT") {
        return { entities: [], relations: [] };
      }
      throw error;
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    const lines = [
      ...graph.entities.map(e => {
        const entityData: any = {
          type: "entity",
          name: e.name,
          entityType: e.entityType,
          observations: e.observations,
          createdAt: e.createdAt,
          lastModified: e.lastModified
        };
        // Phase 3: Only include tags and importance if they exist
        if (e.tags !== undefined) entityData.tags = e.tags;
        if (e.importance !== undefined) entityData.importance = e.importance;
        return JSON.stringify(entityData);
      }),
      ...graph.relations.map(r => JSON.stringify({
        type: "relation",
        from: r.from,
        to: r.to,
        relationType: r.relationType,
        createdAt: r.createdAt,
        lastModified: r.lastModified
      })),
    ];
    await fs.writeFile(this.memoryFilePath, lines.join("\n"));
  }

  /**
   * Phase 4: Create multiple entities in a single batch operation.
   * Batch optimization: All entities are processed and saved in a single saveGraph() call,
   * minimizing disk I/O. This is significantly more efficient than creating entities one at a time.
   */
  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();
    const newEntities = entities
      .filter(e => !graph.entities.some(existingEntity => existingEntity.name === e.name))
      .map(e => {
        const entity: Entity = {
          ...e,
          createdAt: e.createdAt || timestamp,
          lastModified: e.lastModified || timestamp
        };
        // Phase 3: Normalize tags to lowercase if provided
        if (e.tags) {
          entity.tags = e.tags.map(tag => tag.toLowerCase());
        }
        // Phase 3: Validate importance if provided
        if (e.importance !== undefined) {
          if (e.importance < 0 || e.importance > 10) {
            throw new Error(`Importance must be between 0 and 10, got ${e.importance}`);
          }
          entity.importance = e.importance;
        }
        return entity;
      });
    graph.entities.push(...newEntities);
    // Phase 4: Single save operation for all entities ensures batch efficiency
    await this.saveGraph(graph);
    return newEntities;
  }

  /**
   * Phase 4: Create multiple relations in a single batch operation.
   * Batch optimization: All relations are processed and saved in a single saveGraph() call,
   * minimizing disk I/O. This is significantly more efficient than creating relations one at a time.
   */
  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();
    const newRelations = relations
      .filter(r => !graph.relations.some(existingRelation =>
        existingRelation.from === r.from &&
        existingRelation.to === r.to &&
        existingRelation.relationType === r.relationType
      ))
      .map(r => ({ ...r, createdAt: r.createdAt || timestamp, lastModified: r.lastModified || timestamp }));
    graph.relations.push(...newRelations);
    // Phase 4: Single save operation for all relations ensures batch efficiency
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();
    const results = observations.map(o => {
      const entity = graph.entities.find(e => e.name === o.entityName);
      if (!entity) {
        throw new Error(`Entity with name ${o.entityName} not found`);
      }
      const newObservations = o.contents.filter(content => !entity.observations.includes(content));
      entity.observations.push(...newObservations);
      // Update lastModified timestamp if observations were added
      if (newObservations.length > 0) {
        entity.lastModified = timestamp;
      }
      return { entityName: o.entityName, addedObservations: newObservations };
    });
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.entities = graph.entities.filter(e => !entityNames.includes(e.name));
    graph.relations = graph.relations.filter(r => !entityNames.includes(r.from) && !entityNames.includes(r.to));
    await this.saveGraph(graph);
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();
    deletions.forEach(d => {
      const entity = graph.entities.find(e => e.name === d.entityName);
      if (entity) {
        const originalLength = entity.observations.length;
        entity.observations = entity.observations.filter(o => !d.observations.includes(o));
        // Update lastModified timestamp if observations were deleted
        if (entity.observations.length < originalLength) {
          entity.lastModified = timestamp;
        }
      }
    });
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();

    // Track which entities are affected by relation deletions
    const affectedEntityNames = new Set<string>();
    relations.forEach(rel => {
      affectedEntityNames.add(rel.from);
      affectedEntityNames.add(rel.to);
    });

    graph.relations = graph.relations.filter(r => !relations.some(delRelation =>
      r.from === delRelation.from &&
      r.to === delRelation.to &&
      r.relationType === delRelation.relationType
    ));

    // Update lastModified for affected entities
    graph.entities.forEach(entity => {
      if (affectedEntityNames.has(entity.name)) {
        entity.lastModified = timestamp;
      }
    });

    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  // Phase 3: Enhanced search function with tags and importance filters
  async searchNodes(
    query: string,
    tags?: string[],
    minImportance?: number,
    maxImportance?: number
  ): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Normalize tags to lowercase for case-insensitive matching
    const normalizedTags = tags?.map(tag => tag.toLowerCase());
    
    // Filter entities
    const filteredEntities = graph.entities.filter(e => {
      // Text search
      const matchesQuery = 
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.entityType.toLowerCase().includes(query.toLowerCase()) ||
        e.observations.some(o => o.toLowerCase().includes(query.toLowerCase()));
      
      if (!matchesQuery) return false;
      
      // Phase 3: Tag filter
      if (normalizedTags && normalizedTags.length > 0) {
        if (!e.tags || e.tags.length === 0) return false;
        const entityTags = e.tags.map(tag => tag.toLowerCase());
        const hasMatchingTag = normalizedTags.some(tag => entityTags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      
      // Phase 3: Importance filter
      if (minImportance !== undefined && (e.importance === undefined || e.importance < minImportance)) {
        return false;
      }
      if (maxImportance !== undefined && (e.importance === undefined || e.importance > maxImportance)) {
        return false;
      }
      
      return true;
    });
  
    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
  
    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(r => 
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );
  
    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  
    return filteredGraph;
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    
    // Filter entities
    const filteredEntities = graph.entities.filter(e => names.includes(e.name));
  
    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));
  
    // Filter relations to only include those between filtered entities
    const filteredRelations = graph.relations.filter(r => 
      filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to)
    );
  
    const filteredGraph: KnowledgeGraph = {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  
    return filteredGraph;
  }

  // Phase 3: Enhanced searchByDateRange with tags filter
  async searchByDateRange(
    startDate?: string,
    endDate?: string,
    entityType?: string,
    tags?: string[]
  ): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Normalize tags to lowercase for case-insensitive matching
    const normalizedTags = tags?.map(tag => tag.toLowerCase());

    // Filter entities by date range and optionally by entity type and tags
    const filteredEntities = graph.entities.filter(e => {
      // Check entity type filter
      if (entityType && e.entityType !== entityType) {
        return false;
      }

      // Phase 3: Tag filter
      if (normalizedTags && normalizedTags.length > 0) {
        if (!e.tags || e.tags.length === 0) return false;
        const entityTags = e.tags.map(tag => tag.toLowerCase());
        const hasMatchingTag = normalizedTags.some(tag => entityTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Check date range using createdAt or lastModified
      const entityDate = new Date(e.lastModified || e.createdAt || '');

      if (start && entityDate < start) {
        return false;
      }
      if (end && entityDate > end) {
        return false;
      }

      return true;
    });

    // Create a Set of filtered entity names for quick lookup
    const filteredEntityNames = new Set(filteredEntities.map(e => e.name));

    // Filter relations by date range and only include those between filtered entities
    const filteredRelations = graph.relations.filter(r => {
      // Must be between filtered entities
      if (!filteredEntityNames.has(r.from) || !filteredEntityNames.has(r.to)) {
        return false;
      }

      // Check date range using createdAt or lastModified
      const relationDate = new Date(r.lastModified || r.createdAt || '');

      if (start && relationDate < start) {
        return false;
      }
      if (end && relationDate > end) {
        return false;
      }

      return true;
    });

    return {
      entities: filteredEntities,
      relations: filteredRelations,
    };
  }

  async getGraphStats(): Promise<GraphStats> {
    const graph = await this.loadGraph();

    // Calculate entity type counts
    const entityTypesCounts: Record<string, number> = {};
    graph.entities.forEach(e => {
      entityTypesCounts[e.entityType] = (entityTypesCounts[e.entityType] || 0) + 1;
    });

    // Calculate relation type counts
    const relationTypesCounts: Record<string, number> = {};
    graph.relations.forEach(r => {
      relationTypesCounts[r.relationType] = (relationTypesCounts[r.relationType] || 0) + 1;
    });

    // Find oldest and newest entities
    let oldestEntity: { name: string; date: string } | undefined;
    let newestEntity: { name: string; date: string } | undefined;
    let earliestEntityDate: Date | null = null;
    let latestEntityDate: Date | null = null;

    graph.entities.forEach(e => {
      const date = new Date(e.createdAt || '');
      if (!earliestEntityDate || date < earliestEntityDate) {
        earliestEntityDate = date;
        oldestEntity = { name: e.name, date: e.createdAt || '' };
      }
      if (!latestEntityDate || date > latestEntityDate) {
        latestEntityDate = date;
        newestEntity = { name: e.name, date: e.createdAt || '' };
      }
    });

    // Find oldest and newest relations
    let oldestRelation: { from: string; to: string; relationType: string; date: string } | undefined;
    let newestRelation: { from: string; to: string; relationType: string; date: string } | undefined;
    let earliestRelationDate: Date | null = null;
    let latestRelationDate: Date | null = null;

    graph.relations.forEach(r => {
      const date = new Date(r.createdAt || '');
      if (!earliestRelationDate || date < earliestRelationDate) {
        earliestRelationDate = date;
        oldestRelation = { from: r.from, to: r.to, relationType: r.relationType, date: r.createdAt || '' };
      }
      if (!latestRelationDate || date > latestRelationDate) {
        latestRelationDate = date;
        newestRelation = { from: r.from, to: r.to, relationType: r.relationType, date: r.createdAt || '' };
      }
    });

    return {
      totalEntities: graph.entities.length,
      totalRelations: graph.relations.length,
      entityTypesCounts,
      relationTypesCounts,
      oldestEntity,
      newestEntity,
      oldestRelation,
      newestRelation,
      entityDateRange: earliestEntityDate && latestEntityDate ? {
        earliest: (earliestEntityDate as Date).toISOString(),
        latest: (latestEntityDate as Date).toISOString()
      } : undefined,
      relationDateRange: earliestRelationDate && latestRelationDate ? {
        earliest: (earliestRelationDate as Date).toISOString(),
        latest: (latestRelationDate as Date).toISOString()
      } : undefined,
    };
  }
  // Phase 3: Add tags to an entity
  async addTags(entityName: string, tags: string[]): Promise<{ entityName: string; addedTags: string[] }> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();

    const entity = graph.entities.find(e => e.name === entityName);
    if (!entity) {
      throw new Error(`Entity with name ${entityName} not found`);
    }

    // Initialize tags array if it doesn't exist
    if (!entity.tags) {
      entity.tags = [];
    }

    // Normalize tags to lowercase and filter out duplicates
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    const newTags = normalizedTags.filter(tag => !entity.tags!.includes(tag));

    entity.tags.push(...newTags);

    // Update lastModified timestamp if tags were added
    if (newTags.length > 0) {
      entity.lastModified = timestamp;
    }

    await this.saveGraph(graph);

    return { entityName, addedTags: newTags };
  }

  // Phase 3: Remove tags from an entity
  async removeTags(entityName: string, tags: string[]): Promise<{ entityName: string; removedTags: string[] }> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();

    const entity = graph.entities.find(e => e.name === entityName);
    if (!entity) {
      throw new Error(`Entity with name ${entityName} not found`);
    }

    if (!entity.tags) {
      return { entityName, removedTags: [] };
    }

    // Normalize tags to lowercase
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    const originalLength = entity.tags.length;

    // Filter out the tags to remove
    entity.tags = entity.tags.filter(tag => !normalizedTags.includes(tag.toLowerCase()));

    const removedTags = normalizedTags.filter(tag => 
      originalLength > entity.tags!.length || 
      !entity.tags!.map(t => t.toLowerCase()).includes(tag)
    );

    // Update lastModified timestamp if tags were removed
    if (entity.tags.length < originalLength) {
      entity.lastModified = timestamp;
    }

    await this.saveGraph(graph);

    return { entityName, removedTags };
  }

  // Phase 3: Set importance level for an entity
  async setImportance(entityName: string, importance: number): Promise<{ entityName: string; importance: number }> {
    const graph = await this.loadGraph();
    const timestamp = new Date().toISOString();

    // Validate importance range
    if (importance < 0 || importance > 10) {
      throw new Error(`Importance must be between 0 and 10, got ${importance}`);
    }

    const entity = graph.entities.find(e => e.name === entityName);
    if (!entity) {
      throw new Error(`Entity with name ${entityName} not found`);
    }

    entity.importance = importance;
    entity.lastModified = timestamp;

    await this.saveGraph(graph);

    return { entityName, importance };
  }

  // Phase 4: Export graph in various formats
  /**
   * Export the knowledge graph in the specified format with optional filtering.
   * Supports JSON, CSV, and GraphML formats for different use cases.
   *
   * @param format - Export format: 'json', 'csv', or 'graphml'
   * @param filter - Optional filter object with same structure as searchByDateRange
   * @returns Exported graph data as a formatted string
   */
  async exportGraph(
    format: 'json' | 'csv' | 'graphml',
    filter?: {
      startDate?: string;
      endDate?: string;
      entityType?: string;
      tags?: string[];
    }
  ): Promise<string> {
    // Get filtered or full graph based on filter parameter
    let graph: KnowledgeGraph;
    if (filter) {
      graph = await this.searchByDateRange(
        filter.startDate,
        filter.endDate,
        filter.entityType,
        filter.tags
      );
    } else {
      graph = await this.loadGraph();
    }

    switch (format) {
      case 'json':
        return this.exportAsJson(graph);
      case 'csv':
        return this.exportAsCsv(graph);
      case 'graphml':
        return this.exportAsGraphML(graph);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export graph as pretty-printed JSON with all entity and relation data
   */
  private exportAsJson(graph: KnowledgeGraph): string {
    return JSON.stringify(graph, null, 2);
  }

  /**
   * Export graph as CSV with two sections: entities and relations
   * Uses proper escaping for fields containing commas, quotes, and newlines
   */
  private exportAsCsv(graph: KnowledgeGraph): string {
    const lines: string[] = [];

    // Helper function to escape CSV fields
    const escapeCsvField = (field: string | undefined | null): string => {
      if (field === undefined || field === null) return '';
      const str = String(field);
      // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Entities section
    lines.push('# ENTITIES');
    lines.push('name,entityType,observations,createdAt,lastModified,tags,importance');

    for (const entity of graph.entities) {
      const observationsStr = entity.observations.join('; ');
      const tagsStr = entity.tags ? entity.tags.join('; ') : '';
      const importanceStr = entity.importance !== undefined ? String(entity.importance) : '';

      lines.push([
        escapeCsvField(entity.name),
        escapeCsvField(entity.entityType),
        escapeCsvField(observationsStr),
        escapeCsvField(entity.createdAt),
        escapeCsvField(entity.lastModified),
        escapeCsvField(tagsStr),
        escapeCsvField(importanceStr)
      ].join(','));
    }

    // Relations section
    lines.push('');
    lines.push('# RELATIONS');
    lines.push('from,to,relationType,createdAt,lastModified');

    for (const relation of graph.relations) {
      lines.push([
        escapeCsvField(relation.from),
        escapeCsvField(relation.to),
        escapeCsvField(relation.relationType),
        escapeCsvField(relation.createdAt),
        escapeCsvField(relation.lastModified)
      ].join(','));
    }

    return lines.join('\n');
  }

  /**
   * Export graph as GraphML XML format for graph visualization tools
   * Compatible with Gephi, Cytoscape, yEd, and other graph analysis tools
   */
  private exportAsGraphML(graph: KnowledgeGraph): string {
    const lines: string[] = [];

    // Helper function to escape XML special characters
    const escapeXml = (str: string | undefined | null): string => {
      if (str === undefined || str === null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // GraphML header
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<graphml xmlns="http://graphml.graphdrawing.org/xmlns"');
    lines.push('         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    lines.push('         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns');
    lines.push('         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">');

    // Define node attributes (keys)
    lines.push('  <!-- Node attributes -->');
    lines.push('  <key id="d0" for="node" attr.name="entityType" attr.type="string"/>');
    lines.push('  <key id="d1" for="node" attr.name="observations" attr.type="string"/>');
    lines.push('  <key id="d2" for="node" attr.name="createdAt" attr.type="string"/>');
    lines.push('  <key id="d3" for="node" attr.name="lastModified" attr.type="string"/>');
    lines.push('  <key id="d4" for="node" attr.name="tags" attr.type="string"/>');
    lines.push('  <key id="d5" for="node" attr.name="importance" attr.type="double"/>');

    // Define edge attributes (keys)
    lines.push('  <!-- Edge attributes -->');
    lines.push('  <key id="e0" for="edge" attr.name="relationType" attr.type="string"/>');
    lines.push('  <key id="e1" for="edge" attr.name="createdAt" attr.type="string"/>');
    lines.push('  <key id="e2" for="edge" attr.name="lastModified" attr.type="string"/>');

    // Start graph (directed graph)
    lines.push('  <graph id="G" edgedefault="directed">');

    // Add nodes (entities)
    for (const entity of graph.entities) {
      // Use entity name as node ID (escape for XML attribute)
      const nodeId = escapeXml(entity.name);
      lines.push(`    <node id="${nodeId}">`);
      lines.push(`      <data key="d0">${escapeXml(entity.entityType)}</data>`);
      lines.push(`      <data key="d1">${escapeXml(entity.observations.join('; '))}</data>`);
      if (entity.createdAt) {
        lines.push(`      <data key="d2">${escapeXml(entity.createdAt)}</data>`);
      }
      if (entity.lastModified) {
        lines.push(`      <data key="d3">${escapeXml(entity.lastModified)}</data>`);
      }
      if (entity.tags && entity.tags.length > 0) {
        lines.push(`      <data key="d4">${escapeXml(entity.tags.join('; '))}</data>`);
      }
      if (entity.importance !== undefined) {
        lines.push(`      <data key="d5">${entity.importance}</data>`);
      }
      lines.push('    </node>');
    }

    // Add edges (relations)
    let edgeId = 0;
    for (const relation of graph.relations) {
      const sourceId = escapeXml(relation.from);
      const targetId = escapeXml(relation.to);
      lines.push(`    <edge id="e${edgeId}" source="${sourceId}" target="${targetId}">`);
      lines.push(`      <data key="e0">${escapeXml(relation.relationType)}</data>`);
      if (relation.createdAt) {
        lines.push(`      <data key="e1">${escapeXml(relation.createdAt)}</data>`);
      }
      if (relation.lastModified) {
        lines.push(`      <data key="e2">${escapeXml(relation.lastModified)}</data>`);
      }
      lines.push('    </edge>');
      edgeId++;
    }

    // Close graph and graphml
    lines.push('  </graph>');
    lines.push('</graphml>');

    return lines.join('\n');
  }
}

let knowledgeGraphManager: KnowledgeGraphManager;


// The server instance and tools exposed to Claude
const server = new Server({
  name: "memory-server",
  version: "0.7.0",
},    {
    capabilities: {
      tools: {},
    },
  },);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_entities",
        description: "Create multiple new entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The name of the entity" },
                  entityType: { type: "string", description: "The type of the entity" },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents associated with the entity"
                  },
                },
                required: ["name", "entityType", "observations"],
                additionalProperties: false,
              },
            },
          },
          required: ["entities"],
          additionalProperties: false,
        },
      },
      {
        name: "create_relations",
        description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
        inputSchema: {
          type: "object",
          properties: {
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" },
                },
                required: ["from", "to", "relationType"],
                additionalProperties: false,
              },
            },
          },
          required: ["relations"],
          additionalProperties: false,
        },
      },
      {
        name: "add_observations",
        description: "Add new observations to existing entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity to add the observations to" },
                  contents: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents to add"
                  },
                },
                required: ["entityName", "contents"],
                additionalProperties: false,
              },
            },
          },
          required: ["observations"],
          additionalProperties: false,
        },
      },
      {
        name: "delete_entities",
        description: "Delete multiple entities and their associated relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entityNames: { 
              type: "array", 
              items: { type: "string" },
              description: "An array of entity names to delete" 
            },
          },
          required: ["entityNames"],
          additionalProperties: false,
        },
      },
      {
        name: "delete_observations",
        description: "Delete specific observations from entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            deletions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity containing the observations" },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observations to delete"
                  },
                },
                required: ["entityName", "observations"],
                additionalProperties: false,
              },
            },
          },
          required: ["deletions"],
          additionalProperties: false,
        },
      },
      {
        name: "delete_relations",
        description: "Delete multiple relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            relations: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" },
                },
                required: ["from", "to", "relationType"],
                additionalProperties: false,
              },
              description: "An array of relations to delete" 
            },
          },
          required: ["relations"],
          additionalProperties: false,
        },
      },
      {
        name: "read_graph",
        description: "Read the entire knowledge graph",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: "search_nodes",
        description: "Search for nodes in the knowledge graph based on a query, with optional filters for tags and importance",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query to match against entity names, types, and observation content" },
            tags: { 
              type: "array", 
              items: { type: "string" },
              description: "Optional array of tags to filter by (case-insensitive)"
            },
            minImportance: {
              type: "number",
              description: "Optional minimum importance level (0-10)"
            },
            maxImportance: {
              type: "number",
              description: "Optional maximum importance level (0-10)"
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      {
        name: "open_nodes",
        description: "Open specific nodes in the knowledge graph by their names",
        inputSchema: {
          type: "object",
          properties: {
            names: {
              type: "array",
              items: { type: "string" },
              description: "An array of entity names to retrieve",
            },
          },
          required: ["names"],
          additionalProperties: false,
        },
      },
      {
        name: "search_by_date_range",
        description: "Search for entities and relations within a specific date range, optionally filtered by entity type and tags. Uses createdAt or lastModified timestamps.",
        inputSchema: {
          type: "object",
          properties: {
            startDate: {
              type: "string",
              description: "ISO 8601 start date (optional). If not provided, no lower bound is applied."
            },
            endDate: {
              type: "string",
              description: "ISO 8601 end date (optional). If not provided, no upper bound is applied."
            },
            entityType: {
              type: "string",
              description: "Filter by specific entity type (optional)"
            },
            tags: { 
              type: "array", 
              items: { type: "string" },
              description: "Optional array of tags to filter by (case-insensitive)"
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: "get_graph_stats",
        description: "Get comprehensive statistics about the knowledge graph including counts, types, and date ranges",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: "add_tags",
        description: "Add tags to an existing entity in the knowledge graph. Tags are stored as lowercase for case-insensitive matching.",
        inputSchema: {
          type: "object",
          properties: {
            entityName: {
              type: "string",
              description: "The name of the entity to add tags to"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "An array of tags to add to the entity"
            },
          },
          required: ["entityName", "tags"],
          additionalProperties: false,
        },
      },
      {
        name: "remove_tags",
        description: "Remove tags from an existing entity in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entityName: {
              type: "string",
              description: "The name of the entity to remove tags from"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "An array of tags to remove from the entity"
            },
          },
          required: ["entityName", "tags"],
          additionalProperties: false,
        },
      },
      {
        name: "set_importance",
        description: "Set the importance level for an entity. Importance must be a number between 0 and 10.",
        inputSchema: {
          type: "object",
          properties: {
            entityName: {
              type: "string",
              description: "The name of the entity to set importance for"
            },
            importance: {
              type: "number",
              description: "The importance level (0-10, where 0 is least important and 10 is most important)",
              minimum: 0,
              maximum: 10
            },
          },
          required: ["entityName", "importance"],
          additionalProperties: false,
        },
      },
      {
        name: "export_graph",
        description: "Export the knowledge graph in various formats (JSON, CSV, or GraphML) with optional filtering. GraphML format is compatible with graph visualization tools like Gephi and Cytoscape.",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["json", "csv", "graphml"],
              description: "Export format: 'json' for pretty-printed JSON, 'csv' for comma-separated values with entities and relations sections, 'graphml' for GraphML XML format"
            },
            filter: {
              type: "object",
              properties: {
                startDate: {
                  type: "string",
                  description: "ISO 8601 start date for filtering (optional)"
                },
                endDate: {
                  type: "string",
                  description: "ISO 8601 end date for filtering (optional)"
                },
                entityType: {
                  type: "string",
                  description: "Filter by specific entity type (optional)"
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by tags (optional, case-insensitive)"
                }
              },
              description: "Optional filter to export a subset of the graph"
            }
          },
          required: ["format"],
          additionalProperties: false,
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "read_graph") {
    return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.readGraph(), null, 2) }] };
  }

  if (name === "get_graph_stats") {
    return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.getGraphStats(), null, 2) }] };
  }

  if (!args) {
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  switch (name) {
    case "create_entities":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.createEntities(args.entities as Entity[]), null, 2) }] };
    case "create_relations":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.createRelations(args.relations as Relation[]), null, 2) }] };
    case "add_observations":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.addObservations(args.observations as { entityName: string; contents: string[] }[]), null, 2) }] };
    case "delete_entities":
      await knowledgeGraphManager.deleteEntities(args.entityNames as string[]);
      return { content: [{ type: "text", text: "Entities deleted successfully" }] };
    case "delete_observations":
      await knowledgeGraphManager.deleteObservations(args.deletions as { entityName: string; observations: string[] }[]);
      return { content: [{ type: "text", text: "Observations deleted successfully" }] };
    case "delete_relations":
      await knowledgeGraphManager.deleteRelations(args.relations as Relation[]);
      return { content: [{ type: "text", text: "Relations deleted successfully" }] };
    case "search_nodes":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.searchNodes(args.query as string, args.tags as string[] | undefined, args.minImportance as number | undefined, args.maxImportance as number | undefined), null, 2) }] };
    case "open_nodes":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.openNodes(args.names as string[]), null, 2) }] };
    case "search_by_date_range":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.searchByDateRange(args.startDate as string | undefined, args.endDate as string | undefined, args.entityType as string | undefined, args.tags as string[] | undefined), null, 2) }] };
    case "add_tags":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.addTags(args.entityName as string, args.tags as string[]), null, 2) }] };
    case "remove_tags":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.removeTags(args.entityName as string, args.tags as string[]), null, 2) }] };
    case "set_importance":
      return { content: [{ type: "text", text: JSON.stringify(await knowledgeGraphManager.setImportance(args.entityName as string, args.importance as number), null, 2) }] };
    case "export_graph":
      return { content: [{ type: "text", text: await knowledgeGraphManager.exportGraph(args.format as 'json' | 'csv' | 'graphml', args.filter as { startDate?: string; endDate?: string; entityType?: string; tags?: string[] } | undefined) }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  // Initialize memory file path with backward compatibility
  MEMORY_FILE_PATH = await ensureMemoryFilePath();

  // Initialize knowledge graph manager with the memory file path
  knowledgeGraphManager = new KnowledgeGraphManager(MEMORY_FILE_PATH);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Knowledge Graph MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
