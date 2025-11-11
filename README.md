# Enhanced Knowledge Graph Memory Server

An **enhanced fork** of the official Model Context Protocol memory server with **Phase 1-4 enhancements**.

This is a knowledge graph-based persistent memory system that lets Claude remember information across chats, enhanced with:
- **Phase 1 & 2**: Automatic timestamps (createdAt, lastModified), date range search, and comprehensive statistics
- **Phase 3**: Tags and importance categorization for better organization
- **Phase 4**: Multi-format export (JSON, CSV, GraphML) with filtering capabilities

**Version**: 0.7.0 | **Repository**: https://github.com/danielsimonjr/mcp-servers  
**Documentation**: [CHANGELOG.md](CHANGELOG.md) | [WORKFLOW.md](WORKFLOW.md)

## 🚀 Phase 1-4 Enhancements

### What's New
- ✅ **Automatic Timestamps**: createdAt and lastModified fields with smart updates
- ✅ **Date Range Search**: Filter entities/relations by creation or modification date
- ✅ **Graph Statistics**: Comprehensive analytics with counts, types, and temporal data
- ✅ **Tags System**: Categorize entities with case-insensitive tags
- ✅ **Importance Levels**: 0-10 scale for entity prioritization
- ✅ **Advanced Search**: Filter by text, tags, importance, and date ranges
- ✅ **Multi-Format Export**: JSON, CSV, and GraphML for visualization tools
- ✅ **15 Total Tools**: 11 original + 4 new enhancement tools

See [CHANGELOG.md](CHANGELOG.md) for detailed information about all enhancements.

---

A basic implementation of persistent memory using a local knowledge graph. This lets Claude remember information about the user across chats.

## Core Concepts

### Entities
Entities are the primary nodes in the knowledge graph. Each entity has:
- A unique name (identifier)
- An entity type (e.g., "person", "organization", "event")
- A list of observations

Example:
```json
{
  "name": "John_Smith",
  "entityType": "person",
  "observations": ["Speaks fluent Spanish"]
}
```

### Relations
Relations define directed connections between entities. They are always stored in active voice and describe how entities interact or relate to each other.

Example:
```json
{
  "from": "John_Smith",
  "to": "Anthropic",
  "relationType": "works_at"
}
```
### Observations
Observations are discrete pieces of information about an entity. They are:

- Stored as strings
- Attached to specific entities
- Can be added or removed independently
- Should be atomic (one fact per observation)

Example:
```json
{
  "entityName": "John_Smith",
  "observations": [
    "Speaks fluent Spanish",
    "Graduated in 2019",
    "Prefers morning meetings"
  ]
}
```

## API

### Tools
- **create_entities**
  - Create multiple new entities in the knowledge graph
  - Input: `entities` (array of objects)
    - Each object contains:
      - `name` (string): Entity identifier
      - `entityType` (string): Type classification
      - `observations` (string[]): Associated observations
  - Ignores entities with existing names

- **create_relations**
  - Create multiple new relations between entities
  - Input: `relations` (array of objects)
    - Each object contains:
      - `from` (string): Source entity name
      - `to` (string): Target entity name
      - `relationType` (string): Relationship type in active voice
  - Skips duplicate relations

- **add_observations**
  - Add new observations to existing entities
  - Input: `observations` (array of objects)
    - Each object contains:
      - `entityName` (string): Target entity
      - `contents` (string[]): New observations to add
  - Returns added observations per entity
  - Fails if entity doesn't exist

- **delete_entities**
  - Remove entities and their relations
  - Input: `entityNames` (string[])
  - Cascading deletion of associated relations
  - Silent operation if entity doesn't exist

- **delete_observations**
  - Remove specific observations from entities
  - Input: `deletions` (array of objects)
    - Each object contains:
      - `entityName` (string): Target entity
      - `observations` (string[]): Observations to remove
  - Silent operation if observation doesn't exist

- **delete_relations**
  - Remove specific relations from the graph
  - Input: `relations` (array of objects)
    - Each object contains:
      - `from` (string): Source entity name
      - `to` (string): Target entity name
      - `relationType` (string): Relationship type
  - Silent operation if relation doesn't exist

- **read_graph**
  - Read the entire knowledge graph
  - No input required
  - Returns complete graph structure with all entities and relations

- **search_nodes**
  - Search for nodes based on query
  - Input: `query` (string)
  - Searches across:
    - Entity names
    - Entity types
    - Observation content
  - Returns matching entities and their relations

- **open_nodes**
  - Retrieve specific nodes by name
  - Input: `names` (string[])
  - Returns:
    - Requested entities
    - Relations between requested entities
  - Silently skips non-existent nodes

# Usage with Claude Desktop

### Setup

Add this to your claude_desktop_config.json:

#### Docker

```json
{
  "mcpServers": {
    "memory": {
      "command": "docker",
      "args": ["run", "-i", "-v", "claude-memory:/app/dist", "--rm", "mcp/memory"]
    }
  }
}
```

#### NPX
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ]
    }
  }
}
```

#### NPX with custom setting

The server can be configured using the following environment variables:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ],
      "env": {
        "MEMORY_FILE_PATH": "/path/to/custom/memory.jsonl"
      }
    }
  }
}
```

- `MEMORY_FILE_PATH`: Path to the memory storage JSONL file (default: `memory.jsonl` in the server directory)

# VS Code Installation Instructions

For quick installation, use one of the one-click installation buttons below:

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=memory&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40modelcontextprotocol%2Fserver-memory%22%5D%7D) [![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-NPM-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=memory&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40modelcontextprotocol%2Fserver-memory%22%5D%7D&quality=insiders)

[![Install with Docker in VS Code](https://img.shields.io/badge/VS_Code-Docker-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=memory&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22-i%22%2C%22-v%22%2C%22claude-memory%3A%2Fapp%2Fdist%22%2C%22--rm%22%2C%22mcp%2Fmemory%22%5D%7D) [![Install with Docker in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Docker-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=memory&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22-i%22%2C%22-v%22%2C%22claude-memory%3A%2Fapp%2Fdist%22%2C%22--rm%22%2C%22mcp%2Fmemory%22%5D%7D&quality=insiders)

For manual installation, you can configure the MCP server using one of these methods:

**Method 1: User Configuration (Recommended)**
Add the configuration to your user-level MCP configuration file. Open the Command Palette (`Ctrl + Shift + P`) and run `MCP: Open User Configuration`. This will open your user `mcp.json` file where you can add the server configuration.

**Method 2: Workspace Configuration**
Alternatively, you can add the configuration to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

> For more details about MCP configuration in VS Code, see the [official VS Code MCP documentation](https://code.visualstudio.com/docs/copilot/mcp).

#### NPX

```json
{
  "servers": {
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ]
    }
  }
}
```

#### Docker

```json
{
  "servers": {
    "memory": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "-v",
        "claude-memory:/app/dist",
        "--rm",
        "mcp/memory"
      ]
    }
  }
}
```

### System Prompt

The prompt for utilizing memory depends on the use case. Changing the prompt will help the model determine the frequency and types of memories created.

Here is an example prompt for chat personalization. You could use this prompt in the "Custom Instructions" field of a [Claude.ai Project](https://www.anthropic.com/news/projects). 

```
Follow these steps for each interaction:

1. User Identification:
   - You should assume that you are interacting with default_user
   - If you have not identified default_user, proactively try to do so.

2. Memory Retrieval:
   - Always begin your chat by saying only "Remembering..." and retrieve all relevant information from your knowledge graph
   - Always refer to your knowledge graph as your "memory"

3. Memory
   - While conversing with the user, be attentive to any new information that falls into these categories:
     a) Basic Identity (age, gender, location, job title, education level, etc.)
     b) Behaviors (interests, habits, etc.)
     c) Preferences (communication style, preferred language, etc.)
     d) Goals (goals, targets, aspirations, etc.)
     e) Relationships (personal and professional relationships up to 3 degrees of separation)

4. Memory Update:
   - If any new information was gathered during the interaction, update your memory as follows:
     a) Create entities for recurring organizations, people, and significant events
     b) Connect them to the current entities using relations
     c) Store facts about them as observations
```

## Building

Docker:

```sh
docker build -t mcp/memory -f src/memory/Dockerfile . 
```

For Awareness: a prior mcp/memory volume contains an index.js file that could be overwritten by the new container. If you are using a docker volume for storage, delete the old docker volume's `index.js` file before starting the new container.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

### Phase 2: Search & Analytics Tools

- **search_by_date_range**
  - Filter entities and relations within a date range
  - Input: 
    - `startDate` (string, optional): ISO 8601 start date
    - `endDate` (string, optional): ISO 8601 end date
    - `entityType` (string, optional): Filter by entity type
    - `tags` (string[], optional): Filter by tags
  - Uses lastModified or createdAt timestamps
  - Returns filtered knowledge graph

- **get_graph_stats**
  - Get comprehensive statistics about the knowledge graph
  - No input required
  - Returns:
    - Total counts for entities and relations
    - Entity and relation type breakdowns
    - Oldest and newest entities with timestamps
    - Oldest and newest relations with timestamps
    - Date ranges for entities and relations

### Phase 3: Categorization Tools

- **add_tags**
  - Add tags to an existing entity
  - Input:
    - `entityName` (string): Target entity name
    - `tags` (string[]): Tags to add
  - Tags are normalized to lowercase
  - Prevents duplicate tags
  - Updates lastModified timestamp

- **remove_tags**
  - Remove tags from an existing entity
  - Input:
    - `entityName` (string): Target entity name
    - `tags` (string[]): Tags to remove
  - Case-insensitive matching
  - Updates lastModified timestamp

- **set_importance**
  - Set the importance level for an entity
  - Input:
    - `entityName` (string): Target entity name
    - `importance` (number): Importance level (0-10)
  - Validates 0-10 range
  - Updates lastModified timestamp

### Phase 4: Export Tool

- **export_graph**
  - Export the knowledge graph in various formats
  - Input:
    - `format` (string): Export format - "json", "csv", or "graphml"
    - `filter` (object, optional): Filter options
      - `startDate` (string): ISO 8601 start date
      - `endDate` (string): ISO 8601 end date
      - `entityType` (string): Filter by entity type
      - `tags` (string[]): Filter by tags
  - Export formats:
    - **JSON**: Pretty-printed with all entity and relation data
    - **CSV**: Two-section format (entities + relations) with proper escaping
    - **GraphML**: Standard XML format for visualization tools (Gephi, Cytoscape, yEd)

## Enhanced Data Model

### Entity Fields (Phase 1 & 3)
- `name` (string): Entity identifier
- `entityType` (string): Type classification
- `observations` (string[]): Associated observations
- `createdAt` (string, optional): ISO 8601 timestamp - auto-generated on creation
- `lastModified` (string, optional): ISO 8601 timestamp - auto-updated on modification
- `tags` (string[], optional): Lowercase tags for categorization
- `importance` (number, optional): Priority level (0-10)

### Relation Fields (Phase 1)
- `from` (string): Source entity name
- `to` (string): Target entity name  
- `relationType` (string): Relationship type in active voice
- `createdAt` (string, optional): ISO 8601 timestamp - auto-generated on creation
- `lastModified` (string, optional): ISO 8601 timestamp - auto-updated on modification

