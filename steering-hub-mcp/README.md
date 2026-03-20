# Steering Hub MCP Server

MCP (Model Context Protocol) server for AI Coding Agents to access Steering Hub specification system.

## Tools

- `get_steering_tags` - Get all available tags and categories
- `search_steering` - Search specifications with tags and category filters
- `get_spec` - Get full specification content by ID
- `submit_spec` - Submit new specification for review
- `record_usage` - Record specification usage in coding tasks

## Installation

```bash
pip install -e .
```

## Configuration

Set environment variable:
```
STEERING_HUB_API_URL=http://localhost:8080
```

## Usage

Run as MCP server:
```bash
python -m steering_hub_mcp.server
```
