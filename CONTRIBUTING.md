# Contributing to Enhanced Memory MCP

Thanks for your interest in contributing to the Enhanced Memory MCP server! Here's how you can help make this project better.

## About This Project

This is an enhanced fork of the official Model Context Protocol memory server, with Phase 1-4 enhancements adding:
- Automatic timestamp tracking (createdAt, lastModified)
- Advanced search and analytics (date range, statistics)
- Categorization (tags, importance levels)
- Multi-format export (JSON, CSV, GraphML)

**Repository**: https://github.com/danielsimonjr/mcp-servers  
**Documentation**: [README.md](README.md) | [CHANGELOG.md](CHANGELOG.md) | [WORKFLOW.md](WORKFLOW.md)

## Development Workflow

See [WORKFLOW.md](WORKFLOW.md) for detailed development instructions.

Quick start:
```bash
# Navigate to source
cd c:/mcp-servers/memory-mcp/src/memory

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## What We Welcome

### Bug Fixes
- Fix issues with timestamp tracking
- Resolve export formatting problems
- Address search/filter bugs
- Improve backward compatibility

### Usability Improvements
- Better error messages
- Performance optimizations
- Enhanced documentation
- Improved test coverage

### Feature Enhancements
We're particularly interested in:
- Additional export formats
- More sophisticated filtering options
- Performance improvements for large graphs
- Enhanced statistics and analytics
- Better tag management features

### Testing
- Use **vitest** as the test framework
- Add tests for new features
- Ensure backward compatibility
- Test with various data sizes

## What We're Selective About

- **Breaking changes** - Must maintain backward compatibility
- **Highly opinionated features** - Should align with core memory MCP purpose
- **Massive scope changes** - Discuss in an issue first

## How to Contribute

1. **Fork the repository**
   ```bash
   gh repo fork danielsimonjr/mcp-servers
   ```

2. **Create a feature branch**
   ```bash
   cd c:/mcp-servers/memory-mcp
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Edit files in `src/memory/`
   - Follow existing code style
   - Add/update tests
   - Update documentation

4. **Build and test**
   ```bash
   cd src/memory
   npm run build
   npm test
   ```

5. **Commit your changes**
   ```bash
   cd c:/mcp-servers/memory-mcp
   git add .
   git commit -m "Description of your changes"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

## Code Style Guidelines

- Follow TypeScript best practices
- Use meaningful variable names
- Add JSDoc comments for public methods
- Keep functions focused and small
- Maintain consistent indentation (2 spaces)

## Testing Guidelines

- Test new features thoroughly
- Include edge cases
- Test backward compatibility
- Verify export formats are valid
- Test with empty graphs and large graphs

## Documentation

When adding features:
- Update README.md with new tools/functionality
- Add entries to CHANGELOG.md
- Update WORKFLOW.md if development process changes
- Include usage examples

## Pull Request Process

1. **Title**: Clear, descriptive summary
2. **Description**: 
   - What changed
   - Why it changed
   - How to test it
3. **Tests**: Include test results
4. **Documentation**: Update relevant docs
5. **Backward Compatibility**: Confirm no breaking changes

## Questions or Issues?

- **Bug Reports**: Open an issue with detailed reproduction steps
- **Feature Requests**: Open an issue describing the use case
- **Questions**: Check existing issues or open a new one

## Community

This project follows the [Model Context Protocol community guidelines](https://modelcontextprotocol.io/community/communication).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make Enhanced Memory MCP better for everyone! 🎉
