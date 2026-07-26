---
name: memory
description: "Playbook for the memory-mcp knowledge-graph server (sqlite-backed cross-session memory). Use when the user says 'remember this', 'save/store to memory', 'search my memory/knowledge graph', 'what do I know about X', 'record this decision', 'update the graph', 'index this project into memory', 'run memory maintenance / dedup / compress', or 'migrate memory storage'. Consolidates the MEMORY (graph CRUD/search/maintenance), EXPLORE (index a project into the graph + CLAUDE.md), and MIGRATE (JSONL<->SQLite storage) workflows over the memory-mcp tools. Does NOT cover the repo's general dev-utility commands (chunk/cton/commit/deps/graph/search)."
---

# Memory

A judgment layer over the `memory-mcp` server's knowledge-graph tools — entity/relation/observation CRUD, search, tagging, importance scoring, and graph maintenance, backed by sqlite (or JSONL). This skill adds no tools of its own: every action below is one of the server's existing MCP tools, called with the plugin-prefixed name `mcp__plugin_memory-mcp_memory-mcp__<tool>`. Its job is to steer you toward the right operation for a given intent — search before create, tag and score for retrieval later, maintain the graph periodically — rather than reinvent memory management ad hoc.

**Skill root**: this skill ships inside the `memory-mcp` plugin (repo `danielsimonjr/memory-mcp`, `skills/memory/`). Slash trigger: `/memory`.

## When to use / not

**Use this skill** for anything that touches the knowledge graph as long-term memory: storing a fact or decision, recalling what's known about a topic, searching or browsing entities, tagging/scoring/deduping/compressing the graph, indexing a project's current state into memory, or migrating the storage backend between JSONL and SQLite.

**Not for** the repo's general dev-utility commands — `chunk` (file chunking for context-limited edits), `cton`/compress-for-context, `commit`, `deps` (dependency graphs), `graph`, `search` (repo code search) — those are separate, unrelated commands and out of scope here even though some share a word ("graph", "search") with graph operations. If in doubt: does the action read/write the memory-mcp knowledge graph? If not, this skill doesn't apply.

## Core memory operations

The server exposes a large tool surface, but everyday graph work reduces to a small set of operations. All names below are called as `mcp__plugin_memory-mcp_memory-mcp__<tool>`; if a tool isn't loaded, fetch its schema via `ToolSearch select:mcp__plugin_memory-mcp_memory-mcp__<tool>`.

| Intent | Tool |
|---|---|
| Graph stats (entity/relation counts, types) | `get_graph_stats` |
| Search entities by query/tags/importance | `search_nodes` |
| Open specific entities by name | `open_nodes` |
| Read the entire graph (sparingly — see Gotchas) | `read_graph` |
| Find potential duplicate entities | `find_duplicates` |
| Add an observation to an existing entity | `add_observations` |
| Create a new entity | `create_entities` |
| Create a relation between entities | `create_relations` |
| Add tags to an entity | `add_tags` |
| Set an entity's importance (0–10) | `set_importance` |
| Delete an entity | `delete_entities` |
| Delete specific observations | `delete_observations` |
| Merge two+ entities into one | `merge_entities` |
| Compress the graph (merge near-duplicates) | `compress_graph` |

### Session workflow

1. **Session start** — `get_graph_stats` to see what's stored; `search_nodes` for anything relevant to the task at hand.
2. **During work** — `add_observations` to record discoveries and decisions on the relevant entity as they happen, not saved up for the end.
3. **Session end** — `add_observations` with a concise summary of what was accomplished and any open threads, so the next session can pick up context via `search_nodes`/`get_graph_stats`.
4. **Periodically** — run maintenance: `find_duplicates` to check for near-duplicate entities, `compress_graph` (or `merge_entities` for a specific known pair) to consolidate them.

### Tips

- **Search before creating** — `search_nodes` first to avoid spawning duplicate entities for the same subject.
- **Importance is 0–10** — `set_importance` to prioritize what matters; higher-importance entities should surface first in retrieval-conscious workflows.
- **Tag for filtering** — `add_tags` so related entities can be found by category later, not just by name/content match.
- **Keep observations concise** — one fact per observation string; prefer adding a new observation to an existing entity over duplicating the entity itself.

## Index a project

To bring a project's current state into the graph (what the `EXPLORE` command did), compose ordinary file/shell tools with the memory tools — this is not a single memory-mcp tool call, it's a recipe:

1. **Gather project metadata** — `Read`/`Bash` for `package.json` (name, version, description), `git log --oneline` and `git status --short` for recent history, `Glob`/`Grep` for source and test file counts, `git diff --stat` for recent-change scope.
2. **Check for an existing project entity** — `search_nodes` for the project name before creating anything new.
3. **Create or update the entity** — `create_entities` if it doesn't exist yet (type `"project"`, tagged and scored with `set_importance`); otherwise `add_observations` on the existing entity with the current version, tool/test counts, recent-change summary, and any architectural patterns worth remembering.
4. **Create entities for new components** — new managers, major classes, tool categories, or features discovered along the way, each as its own entity.
5. **Relate them** — `create_relations` to connect components to the project entity and to each other (e.g. `has_component`, `uses`), in active voice.
6. **Optionally update CLAUDE.md** — if the project's CLAUDE.md documents version numbers, tool/test counts, or dependency versions that have drifted from what step 1 found, update those sections directly (plain file edit, not a memory-mcp call).

This is an occasional, not a per-turn, workflow — run it at the start of a work session on a project you haven't touched recently, or after a batch of changes big enough that the graph's record of the project is stale.

## Migrate storage

The `migrate-from-jsonl-to-sqlite` tool converts between the two supported storage backends:

- **JSONL** (`.jsonl`, `.json`) and **SQLite** (`.db`, `.sqlite`, `.sqlite3`) — format is auto-detected from the file extension on both the source and target.
- Options: `--from`/`-f <path>`, `--to`/`-t <path>`, `--verbose`/`-v` for detailed progress. Positional arguments (`<source> <target>`) work too.
- Migration includes a verification step to confirm data integrity after conversion.
- The target file is created if missing and **overwritten** if it already exists.
- Saved searches and tag aliases are stored separately and are **not** migrated — carry those over manually if needed.

This is a standalone executable, not an MCP tool call. It ships with memory-mcp under `tools/migrate-from-jsonl-to-sqlite/` in the repo — locate it relative to wherever memory-mcp is installed rather than assuming a fixed path, since the install location varies by machine. Treat this as an occasional maintenance operation (e.g. moving a project from JSONL to SQLite for performance, or the reverse for portability), not something invoked mid-session.

## Gotchas

- **`read_graph` can be huge** — it returns the entire graph. Prefer `search_nodes` (filtered by query/tags/importance) or `open_nodes` (specific names) for everyday retrieval; reach for `read_graph` only when you actually need the whole thing.
- **Dedup before bulk-creating** — running `find_duplicates` (and `compress_graph`/`merge_entities` as needed) before a large `create_entities` batch avoids compounding near-duplicate entities that then need cleanup later.
- **The tool surface is large (241 tools)** — this skill covers the everyday CRUD/search/maintenance/indexing/migration operations above. For anything else (freshness/decay, sessions and working memory, causal reasoning, RBAC, procedural memory, event memory, reconstructive memory, agent reflections, relation consolidation, and more), use `ToolSearch` with query `+memory-mcp` to discover the right tool rather than guessing a name.
