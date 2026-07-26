# Documentation Index

Welcome to the Enhanced Memory MCP documentation! This directory contains comprehensive documentation for developers, users, and contributors.

## Table of Contents

- [Core Documentation](#core-documentation)
- [User Guides](#user-guides)
- [Development Documentation](#development-documentation)
- [Project Reports](#project-reports)

## Core Documentation

### [Project Overview](./architecture/OVERVIEW.md)
High-level introduction to Memory MCP covering:
- Key capabilities and features
- Quick architecture diagram
- Data model (Entity, Relation)
- Directory structure
- Tool categories (241 total across 65 categories)
- Performance characteristics

### [API Reference](./architecture/API.md)
Complete API documentation for all 241 tools provided by the Enhanced Memory MCP server, including:
- Entity, relation, observation operations
- Search variants (basic, ranked, boolean, fuzzy, hybrid, semantic, smart, active retrieval)
- Hierarchy management
- Compression and archiving
- Import/export (JSON / CSV / GraphML / GEXF / DOT / Markdown / Mermaid + W3C Turtle / RDF/XML / JSON-LD; PII redaction)
- Bitemporal validity and time-travel queries (η.4.4)
- Optimistic concurrency control (η.5.5.c)
- RBAC (η.6.1)
- Procedural memory (3B.4)
- Causal reasoning and world model (3B.6 / 3B.7)
- Tool affordance, heuristic guidelines, project context, decision rationale, exclusions, observation dedup, spell correction (Phase 16 / memoryjs v2.1.0)
- Engineering / diagnostics (v12.5.0)
- Event memory, reconstructive memory + snapshot persistence, relation consolidation, agent reflection (v12.7.0 / memoryjs v3.0.0)
- Analytics and validation

### [Architecture Details](./architecture/ARCHITECTURE.md)
In-depth technical architecture documentation covering:
- System design and component structure
- Modular server design (MCPServer, toolDefinitions, toolHandlers)
- Lazy initialization patterns
- Performance optimization strategies
- Context optimization improvements (v0.47.0)

### [Component Reference](./architecture/COMPONENTS.md)
Detailed documentation for all system components:
- Server components (MCPServer, toolDefinitions, toolHandlers)
- Core components (KnowledgeGraphManager, EntityManager, GraphStorage)
- Search components (SearchManager, BasicSearch, RankedSearch, BooleanSearch, FuzzySearch)
- Feature components (HierarchyManager, CompressionManager, ExportManager, etc.)
- Utility components and type definitions
- Component dependencies diagram

### [Data Flow](./architecture/DATAFLOW.md)
Comprehensive data flow documentation covering:
- Request processing pipeline
- Entity and relation operation flows
- Search operation flows (basic, ranked, boolean, fuzzy)
- Hierarchy and compression operation flows
- Import/export operation flows
- Caching strategy and error handling

### [Workflow](./development/WORKFLOW.md)
Development workflow and operational procedures for working with the memory server.

## User Guides

The `guides/` directory contains feature-specific user guides:

- **[Archiving Guide](./guides/ARCHIVING.md)** - How to archive old or low-importance entities
- **[Compression Guide](./guides/COMPRESSION.md)** - Duplicate detection and entity merging
- **[Hierarchy Guide](./guides/HIERARCHY.md)** - Parent-child relationships and tree navigation
- **[Migration Guide](./guides/MIGRATION.md)** - Migrating data and upgrading between versions
- **[Query Language](./guides/QUERY_LANGUAGE.md)** - Boolean search syntax and advanced queries

## Development Documentation

The `development/` directory contains planning and implementation documents:

- **[Implementation Plan](./development/IMPLEMENTATION_PLAN.md)** - Overall implementation roadmap
- **[Implementation Tasks](./development/IMPLEMENTATION_TASKS.md)** - Detailed task breakdown
- **[Improvement Plan](./development/IMPROVEMENT_PLAN.md)** - Enhancement proposals and future features
- **[Refactoring Plan](./development/REFACTORING_PLAN.md)** - Code refactoring strategy and phases

## Project Reports

The `reports/` directory contains progress summaries and sprint reports:

- **[Sprint Progress](./reports/SPRINT_PROGRESS.md)** - Detailed sprint-by-sprint progress tracking
- **[Sprint Summary](./reports/SPRINT_SUMMARY.md)** - High-level sprint outcomes
- **[Refactoring Summary](./reports/REFACTORING_SUMMARY.md)** - Architecture refactoring results
- **[Improvements Summary](./reports/IMPROVEMENTS_SUMMARY.md)** - Feature improvements and enhancements
- **[Task Summary](./reports/TASK_SUMMARY.md)** - Completed tasks overview

## Getting Started

1. **New Users**: Start with the [main README](../README.md) and [API Reference](./API.md)
2. **Feature Usage**: Check the relevant guide in [guides/](./guides/)
3. **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md) and [development/](./development/)
4. **Architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details

## Additional Resources

- **[Changelog](../CHANGELOG.md)** - Version history and release notes
- **[Security](../SECURITY.md)** - Security policies and vulnerability reporting
- **[Code of Conduct](../CODE_OF_CONDUCT.md)** - Community guidelines
- **[License](../LICENSE)** - MIT License

---

For questions or issues, please refer to the [GitHub repository](https://github.com/danielsimonjr/memory-mcp).
