"""
Steering Hub MCP Server

Provides MCP tools for AI Coding Agents to search, retrieve, submit, and
track usage of development specifications managed by Steering Hub.
"""
import asyncio
import os
import sys
from typing import Optional

import structlog
from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolResult,
    TextContent,
    Tool,
)
import mcp.types as types

from . import client

load_dotenv()

# Configure structured logging
import logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level), stream=sys.stderr)
logger = structlog.get_logger()

app = Server("steering-hub-mcp")


# ============================================================
# Tool Definitions
# ============================================================

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_steering_tags",
            description=(
                "Get tags and categories in the specification system (two-level design to control token usage). "
                "\n\nUsage:"
                "\n1. Call without category_code: Get categories overview with tag/spec counts (~100 tokens)"
                "\n2. Call with category_code: Get specific category's tags list"
                "\n\nAI Coding Agents should call this before starting coding tasks to understand "
                "what specification dimensions exist, then choose appropriate tags based on task semantics."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "category_code": {
                        "type": "string",
                        "description": (
                            "Optional category code to get detailed tags. "
                            "Values: coding | architecture | business | security | testing | documentation"
                        ),
                    },
                },
            },
        ),
        Tool(
            name="search_steering",
            description=(
                "Search for the most relevant coding/business specifications to guide AI Coding Agents "
                "in writing standards-compliant code. "
                "\n\nWhen to call:"
                "\n- Before starting to write a new module (call get_steering_tags first to learn available tags)"
                "\n- When facing uncertain technical decisions"
                "\n- When needing to understand business rules"
                "\n\nReturns only 'active' (officially effective) specs."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": (
                            "Semantic description combining current coding task context, "
                            "e.g. 'Order Controller URL design' or 'MySQL pagination performance'"
                        ),
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": (
                            "Select relevant tags from get_steering_tags results, e.g. ['Controller', 'Order']. "
                            "Helps prioritize specs matching these tags."
                        ),
                    },
                    "category_code": {
                        "type": "string",
                        "description": (
                            "Optional category code to narrow search scope. "
                            "Values: coding | architecture | business | security | testing | documentation"
                        ),
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 5, max: 20)",
                        "default": 5,
                    },
                    "agent_id": {
                        "type": "string",
                        "description": "Calling agent identifier for usage tracking",
                    },
                    "repo": {
                        "type": "string",
                        "description": "Source repository name for context",
                    },
                    "task_description": {
                        "type": "string",
                        "description": "Current coding task description for context",
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="get_spec",
            description=(
                "Retrieve the full content of a specific specification by its ID. "
                "Only returns specs in 'active' status."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "spec_id": {
                        "type": "integer",
                        "description": "The numeric ID of the specification",
                    },
                },
                "required": ["spec_id"],
            },
        ),
        Tool(
            name="submit_spec",
            description=(
                "Submit a new specification for human review. "
                "Use this when you identify a missing or needed specification during coding. "
                "The spec will be created in 'draft' status and requires human approval before taking effect."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Clear, concise title of the specification",
                    },
                    "content": {
                        "type": "string",
                        "description": "Full Markdown content of the specification",
                    },
                    "category": {
                        "type": "string",
                        "description": "Category code: coding | architecture | business | security | testing | documentation",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags for easier discovery",
                    },
                },
                "required": ["title", "content", "category"],
            },
        ),
        Tool(
            name="record_usage",
            description=(
                "Record that a specification was used in a coding task. "
                "Call this after loading and applying a spec, to enable usage tracking and compliance auditing."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "spec_id": {
                        "type": "integer",
                        "description": "ID of the specification that was used",
                    },
                    "repo": {
                        "type": "string",
                        "description": "Repository full name, e.g. 'org/my-service'",
                    },
                    "task_description": {
                        "type": "string",
                        "description": "Brief description of the task where the spec was applied",
                    },
                },
                "required": ["spec_id", "repo", "task_description"],
            },
        ),
    ]


# ============================================================
# Tool Handlers
# ============================================================

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.ContentBlock]:
    logger.info("tool_called", tool=name, args=arguments)

    try:
        if name == "get_steering_tags":
            return await handle_get_steering_tags(arguments)
        elif name == "search_steering":
            return await handle_search_steering(arguments)
        elif name == "get_spec":
            return await handle_get_spec(arguments)
        elif name == "submit_spec":
            return await handle_submit_spec(arguments)
        elif name == "record_usage":
            return await handle_record_usage(arguments)
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    except Exception as e:
        logger.error("tool_error", tool=name, error=str(e))
        return [TextContent(type="text", text=f"Error: {str(e)}")]


async def handle_get_steering_tags(args: dict) -> list[types.ContentBlock]:
    category_code = args.get("category_code")
    result = await client.get_all_tags(category_code)

    if category_code is None:
        # Overview mode: show categories with counts
        lines = [
            "# Specification Categories Overview\n",
            result.get("hint", ""),
            "\n## Categories\n"
        ]

        for cat in result.get("categories", []):
            lines.append(
                f"- **{cat['name']}** (code: `{cat['code']}`)\n"
                f"  - Tags: {cat['tag_count']}\n"
                f"  - Active specs: {cat['spec_count']}\n"
            )

        lines.append(
            "\n---\n"
            "**Next step:** Call get_steering_tags(category_code='coding') "
            "to see detailed tags for a specific category."
        )

        content = "\n".join(lines)
    else:
        # Detail mode: show specific category tags
        cat_info = result.get("category", {})
        tags = result.get("tags", [])
        hint = result.get("hint", "")

        tags_str = ", ".join(tags) if tags else "No tags found"

        content = (
            f"# {cat_info.get('name')} Tags\n\n"
            f"**Category:** {cat_info.get('name')} (`{cat_info.get('code')}`)\n"
            f"**Available tags:** {tags_str}\n\n"
            f"---\n{hint}"
        )

    return [TextContent(type="text", text=content)]


async def handle_search_steering(args: dict) -> list[types.ContentBlock]:
    query = args["query"]
    tags = args.get("tags", [])
    category_code = args.get("category_code")
    limit = min(int(args.get("limit", 5)), 20)
    agent_id = args.get("agent_id", "mcp-agent")
    repo = args.get("repo", "")
    task_description = args.get("task_description", "")
    import time
    start_time = time.time()

    # Resolve category_id if category_code provided
    category_id = None
    if category_code:
        categories = await client.get_categories()
        for cat in categories:
            if cat.get("code") == category_code:
                category_id = cat["id"]
                break
        if not category_id:
            return [TextContent(type="text", text=f"Invalid category_code: {category_code}")]

    # Append tags to query for better matching
    enhanced_query = query
    if tags:
        enhanced_query = f"{query} {' '.join(tags)}"

    results = await client.search_specs(enhanced_query, category_id, limit * 2)  # Fetch more for filtering

    if not results:
        return [TextContent(type="text", text="No active specifications found matching your query.")]

    # Post-filter and boost results matching tags
    filtered_results = []
    for r in results:
        spec_tags = set(r.get("tags") or [])
        tag_matches = len(spec_tags.intersection(set(tags))) if tags else 0
        r["_tag_matches"] = tag_matches
        filtered_results.append(r)

    # Sort by tag matches (desc) then by original score (desc)
    filtered_results.sort(key=lambda x: (x["_tag_matches"], x.get("score", 0)), reverse=True)

    # Take top N
    filtered_results = filtered_results[:limit]

    # 异步记录查询日志
    response_time_ms = int((time.time() - start_time) * 1000)
    asyncio.create_task(client.log_search_query(
        query=query, mode="hybrid", results=filtered_results,
        agent_id=agent_id, repo=repo, task_description=task_description,
        response_time_ms=response_time_ms
    ))

    lines = [f"Found {len(filtered_results)} specification(s):\n"]
    for r in filtered_results:
        tags_str = ", ".join(r.get("tags") or [])
        tag_match_info = f" (matched {r['_tag_matches']} tags)" if r["_tag_matches"] > 0 else ""
        lines.append(
            f"## [{r['specId']}] {r['title']}{tag_match_info}\n"
            f"- Category: {r.get('categoryName', 'N/A')}\n"
            f"- Tags: {tags_str or 'N/A'}\n"
            f"- Score: {r.get('score', 0):.2f}\n"
            f"- Version: {r.get('currentVersion', 1)}\n\n"
            f"{r.get('content', '')[:500]}{'...' if len(r.get('content','')) > 500 else ''}\n"
            f"---\n"
        )
    return [TextContent(type="text", text="\n".join(lines))]


async def handle_get_spec(args: dict) -> list[types.ContentBlock]:
    spec_id = int(args["spec_id"])
    spec = await client.get_spec(spec_id)

    tags_str = ", ".join(spec.get("tags") or [])
    content = (
        f"# {spec['title']}\n\n"
        f"**ID:** {spec['id']}  \n"
        f"**Category:** {spec.get('categoryName', 'N/A')}  \n"
        f"**Version:** {spec.get('currentVersion', 1)}  \n"
        f"**Tags:** {tags_str or 'N/A'}  \n"
        f"**Status:** {spec.get('status')}  \n\n"
        f"---\n\n"
        f"{spec.get('content', '')}"
    )
    return [TextContent(type="text", text=content)]


async def handle_submit_spec(args: dict) -> list[types.ContentBlock]:
    title = args["title"]
    content = args["content"]
    category = args["category"]
    tags = args.get("tags", [])

    result = await client.submit_spec(title, content, category, tags)

    return [TextContent(
        type="text",
        text=(
            f"Specification submitted successfully for human review.\n\n"
            f"**ID:** {result.get('id')}  \n"
            f"**Title:** {result.get('title')}  \n"
            f"**Status:** draft (pending human review)  \n\n"
            f"The specification will become effective after it passes the review process."
        )
    )]


async def handle_record_usage(args: dict) -> list[types.ContentBlock]:
    spec_id = int(args["spec_id"])
    repo = args["repo"]
    task_description = args["task_description"]

    result = await client.record_usage(spec_id, repo, task_description)

    return [TextContent(
        type="text",
        text=(
            f"Usage recorded successfully.\n"
            f"Spec {spec_id} usage in '{repo}' has been logged for compliance tracking."
        )
    )]


# ============================================================
# Entry point
# ============================================================

def main():
    async def run():
        async with stdio_server() as (read_stream, write_stream):
            await app.run(read_stream, write_stream, app.create_initialization_options())

    asyncio.run(run())


if __name__ == "__main__":
    main()
