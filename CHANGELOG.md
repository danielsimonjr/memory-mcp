# Changelog

All notable changes to the Enhanced Memory MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2025-11-09

### Added - Phase 4: Export & Batch Operations

#### New Tools
- **export_graph** - Export knowledge graph in multiple formats
  - JSON format: Pretty-printed with all entity and relation data
  - CSV format: Two-section format (entities + relations) with proper escaping
  - GraphML format: Standard XML for visualization tools (Gephi, Cytoscape, yEd)
  - Optional filter parameter supports: startDate, endDate, entityType, tags
  - All export formats include Phase 1-3 fields (timestamps, tags, importance)

#### Enhancements
- Added JSDoc documentation to `createEntities()` and `createRelations()` for batch operation efficiency
- Documented single `saveGraph()` call per batch operation
- CSV export includes proper escaping for commas, quotes, and newlines
- GraphML export includes all node/edge attributes with proper XML escaping

### Added - Phase 3: Tags & Importance Categorization

#### New Fields
- **tags** (string[]): Optional array of tags for entity categorization
  - Normalized to lowercase for case-insensitive matching
  - Persisted to JSONL storage
- **importance** (number): Optional importance level (0-10 scale)
  - Validated on creation and modification
  - Used for filtering and prioritization

#### New Tools
- **add_tags** - Add tags to existing entities
  - Normalizes tags to lowercase
  - Prevents duplicates
  - Updates lastModified timestamp
- **remove_tags** - Remove tags from entities
  - Case-insensitive matching
  - Updates lastModified timestamp
- **set_importance** - Set entity importance level
  - Validates 0-10 range
  - Updates lastModified timestamp

#### Enhanced Tools
- **search_nodes** - Added optional filters:
  - `tags` (string[]): Filter by tags (case-insensitive)
  - `minImportance` (number): Minimum importance threshold
  - `maxImportance` (number): Maximum importance threshold
- **search_by_date_range** - Added optional `tags` filter parameter

### Added - Phase 2: Search & Analytics

#### New Tools
- **search_by_date_range** - Filter entities and relations by date range
  - Parameters: startDate (optional), endDate (optional), entityType (optional)
  - Uses lastModified or createdAt as fallback
  - Returns filtered knowledge graph
- **get_graph_stats** - Get comprehensive graph statistics
  - Total counts for entities and relations
  - Entity types breakdown (count per type)
  - Relation types breakdown (count per type)
  - Oldest and newest entities with dates
  - Oldest and newest relations with dates
  - Date ranges for entities and relations

#### New Interface
- **GraphStats** - TypeScript interface for statistics output
  - totalEntities, totalRelations
  - entityTypesCounts, relationTypesCounts
  - oldestEntity, newestEntity, oldestRelation, newestRelation
  - entityDateRange, relationDateRange

### Added - Phase 1: Timestamp Tracking

#### New Fields
- **createdAt** (string): ISO 8601 timestamp for entity/relation creation
  - Auto-generated if not provided
  - Persisted to JSONL storage
- **lastModified** (string): ISO 8601 timestamp for last modification
  - Auto-updated on all modification operations
  - Smart updates: only changes when actual modifications occur

#### Modified Methods
- **createEntities()** - Auto-generates createdAt and lastModified timestamps
- **createRelations()** - Auto-generates createdAt and lastModified timestamps
- **addObservations()** - Updates lastModified only if observations added
- **deleteObservations()** - Updates lastModified only if observations removed
- **deleteRelations()** - Updates lastModified on affected entities
- **loadGraph()** - Backward compatibility for data without timestamps
- **saveGraph()** - Persists timestamps to JSONL format

#### Technical Details
- All timestamps use ISO 8601 format via `new Date().toISOString()`
- Optional fields (`?`) ensure backward compatibility
- Smart timestamp logic: only update when actual changes occur
- Relation deletions update `lastModified` on affected entities

### Changed
- Updated server version from 0.6.3 to 0.7.0
- Total code expansion: 713 → 1,210 lines (+497 lines, +70%)
- Total MCP tools: 11 → 15 tools (+4 new)

### Technical Notes
- All new fields are optional for backward compatibility
- Existing data loads gracefully without timestamps, tags, or importance
- All export formats maintain backward compatibility
- Filter logic reused across search_nodes, searchByDateRange, and export_graph

## [0.6.3] - 2025-11-09 (Initial Fork)

### Added
- Forked from modelcontextprotocol/servers
- Base memory MCP with 11 original tools:
  - create_entities
  - create_relations
  - add_observations
  - delete_entities
  - delete_observations
  - delete_relations
  - read_graph
  - search_nodes
  - open_nodes

### Repository
- GitHub: https://github.com/danielsimonjr/mcp-servers
- Location: c:/mcp-servers/memory-mcp/
- Branch: main

---

## Summary of Enhancements

| Phase | Features | Tools Added | Lines Added |
|-------|----------|-------------|-------------|
| Phase 1 | Timestamp tracking (createdAt, lastModified) | 0 | +223 |
| Phase 2 | Search & analytics | 2 (search_by_date_range, get_graph_stats) | Included in Phase 1 |
| Phase 3 | Tags & importance | 3 (add_tags, remove_tags, set_importance) | +249 |
| Phase 4 | Export & batch ops | 1 (export_graph) | +248 |
| **Total** | **All enhancements** | **+4 tools (15 total)** | **+497 lines (+70%)** |

## Links
- [Repository](https://github.com/danielsimonjr/mcp-servers)
- [Workflow Guide](WORKFLOW.md)
- [Model Context Protocol](https://modelcontextprotocol.io)
