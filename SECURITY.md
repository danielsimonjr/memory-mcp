# Security Policy

Thank you for helping keep the Enhanced Memory MCP server secure.

## About This Project

This is an **enhanced fork** of the official Model Context Protocol memory server, originally maintained by [Anthropic](https://www.anthropic.com/). This fork adds Phase 1-4 enhancements including timestamps, tags, importance levels, advanced search, and export functionality.

**Repository**: https://github.com/danielsimonjr/mcp-servers

## Security Considerations

### Data Storage
- Memory data is stored locally in JSONL format
- Default location: `memory.jsonl` in the server directory
- Custom location: Set via `MEMORY_FILE_PATH` environment variable
- **Important**: Memory files may contain sensitive user information

### File Access
- The server has read/write access to the memory file
- Exported data (JSON, CSV, GraphML) contains all filtered graph data
- Ensure proper file permissions on memory storage directory
- Review exported files before sharing

### Input Validation
- Entity names, types, and observations are stored as provided
- Tags are normalized to lowercase
- Importance values are validated (0-10 range)
- Date filters use ISO 8601 format
- Export formats properly escape special characters (CSV, GraphML)

### Network Exposure
- Server runs locally via stdio (no network exposure by default)
- Accessed only through Claude Desktop or MCP-compatible clients
- No external API calls or data transmission

## Reporting Security Issues

### For This Enhanced Fork
If you discover a security vulnerability in the **Phase 1-4 enhancements** (timestamps, tags, importance, search, export):

1. **Do NOT** open a public GitHub issue
2. Email the maintainer with details:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### For Upstream Issues
If you discover a vulnerability in the **original memory server functionality** (core entity/relation/observation operations):

Please report through Anthropic's official channels:
- [HackerOne program page](https://hackerone.com/anthropic-vdp)
- [Submission form](https://hackerone.com/anthropic-vdp/reports/new?type=team&report_type=vulnerability)

## Security Best Practices

### For Users

1. **Protect Your Memory File**
   ```bash
   # Set restrictive permissions
   chmod 600 memory.jsonl
   ```

2. **Use Custom Storage Location**
   ```json
   {
     "mcpServers": {
       "memory": {
         "env": {
           "MEMORY_FILE_PATH": "/secure/path/memory.jsonl"
         }
       }
     }
   }
   ```

3. **Review Exports Before Sharing**
   - CSV/JSON/GraphML exports contain full entity data
   - Use filter parameters to limit exported data
   - Check for sensitive information before distribution

4. **Regular Backups**
   ```bash
   # Backup your memory file
   cp memory.jsonl memory.jsonl.backup
   ```

### For Developers

1. **Input Sanitization**
   - All user input should be treated as untrusted
   - Validate data types and ranges
   - Escape output properly (especially in CSV/GraphML)

2. **File Operations**
   - Use absolute paths when possible
   - Validate file paths before operations
   - Handle file errors gracefully

3. **Export Security**
   - CSV: Proper escaping of quotes, commas, newlines
   - GraphML: XML entity escaping
   - JSON: Valid JSON encoding

4. **Testing**
   - Test with malicious input
   - Verify export format safety
   - Check for injection vulnerabilities

## Known Limitations

- No built-in encryption for stored data
- No user authentication/authorization
- Local file access only (no cloud sync)
- Memory file readable by any process with file access

## Security Updates

Security updates will be documented in [CHANGELOG.md](CHANGELOG.md) with a **[SECURITY]** prefix.

## Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged (with permission) in release notes.

---

**Last Updated**: 2025-11-09  
**Version**: 0.7.0
