"""HTTP client for Steering Hub backend API"""
import os
from typing import Any, Optional
import httpx
import structlog

logger = structlog.get_logger()

API_BASE_URL = os.getenv("STEERING_HUB_API_URL", "http://localhost:8080")
API_KEY = os.getenv("STEERING_HUB_API_KEY", "")


def _get_headers() -> dict:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if API_KEY:
        headers["X-API-Key"] = API_KEY
    return headers


async def search_specs(query: str, category_id: Optional[int] = None, limit: int = 10, mode: str = "hybrid") -> list[dict]:
    """Call /api/v1/search with hybrid mode, only returns 'active' specs"""
    params: dict[str, Any] = {
        "query": query,
        "limit": limit,
        "mode": mode,
    }
    if category_id:
        params["categoryId"] = category_id

    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get("/api/v1/search", params=params)
        resp.raise_for_status()
        data = resp.json()
        # Filter to active specs only (should already be filtered server-side)
        results = data.get("data", [])
        return [r for r in results if r.get("status") == "active"]


async def get_spec(spec_id: int) -> dict:
    """Get spec detail by ID"""
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get(f"/api/v1/specs/{spec_id}")
        resp.raise_for_status()
        data = resp.json()
        spec = data.get("data", {})
        if spec.get("status") != "active":
            raise ValueError(f"Spec {spec_id} is not active (status={spec.get('status')})")
        return spec


async def get_categories() -> list[dict]:
    """Get all spec categories"""
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get("/api/v1/categories")
        resp.raise_for_status()
        return resp.json().get("data", [])


async def get_all_tags(category_code: Optional[str] = None) -> dict:
    """
    Get tags overview or specific category tags

    Args:
        category_code: Optional category code (e.g. 'coding', 'business')

    Returns:
        - If category_code is None: dict with categories overview (tag_count, spec_count)
        - If category_code provided: dict with category info and tags list
    """
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        if category_code is None:
            # Return categories overview with tag/spec counts
            categories = await get_categories()
            category_stats = []

            for cat in categories:
                if not cat.get("enabled", True):
                    continue

                cat_id = cat["id"]
                # Fetch specs for this category
                resp = await client.get("/api/v1/specs", params={
                    "page": 1,
                    "size": 200,
                    "categoryId": cat_id
                })
                resp.raise_for_status()
                data = resp.json().get("data", {})
                records = data.get("records", [])

                # Count active specs and extract tags
                active_specs = [s for s in records if s.get("status") == "active"]
                tags_set = set()
                for spec in active_specs:
                    if spec.get("tags"):
                        for tag in spec["tags"]:
                            if tag:
                                tags_set.add(tag)

                category_stats.append({
                    "code": cat.get("code"),
                    "name": cat.get("name"),
                    "tag_count": len(tags_set),
                    "spec_count": len(active_specs)
                })

            return {
                "hint": "Pass category_code to get tags for a specific category",
                "categories": category_stats
            }
        else:
            # Return specific category tags
            categories = await get_categories()
            category = None
            for cat in categories:
                if cat.get("code") == category_code:
                    category = cat
                    break

            if not category:
                raise ValueError(f"Category not found: {category_code}")

            # Fetch specs for this category
            resp = await client.get("/api/v1/specs", params={
                "page": 1,
                "size": 200,
                "categoryId": category["id"]
            })
            resp.raise_for_status()
            data = resp.json().get("data", {})
            records = data.get("records", [])

            # Extract tags from active specs
            tags_set = set()
            for spec in records:
                if spec.get("status") == "active" and spec.get("tags"):
                    for tag in spec["tags"]:
                        if tag:
                            tags_set.add(tag)

            return {
                "category": {
                    "code": category.get("code"),
                    "name": category.get("name")
                },
                "tags": sorted(list(tags_set)),
                "hint": "Use these tags in search_steering() to improve accuracy"
            }


async def submit_spec(title: str, content: str, category: str, tags: list[str]) -> dict:
    """Submit a new spec for human review (creates in DRAFT status)"""
    # Resolve category id from code
    category_id = await _resolve_category_id(category)
    payload = {
        "title": title,
        "content": content,
        "categoryId": category_id,
        "tags": tags,
    }
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.post("/api/v1/specs", json=payload)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def record_usage(spec_id: int, repo: str, task_description: str, agent_id: str = "mcp-agent") -> dict:
    """Record spec usage from MCP tool call"""
    # Ensure repo is registered
    repo_id = await _ensure_repo(repo)
    payload = {
        "specId": spec_id,
        "repoId": repo_id,
        "repoName": repo,
        "taskDescription": task_description,
        "agentId": agent_id,
    }
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.post("/api/v1/usage", json=payload)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _resolve_category_id(code: str) -> int:
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get("/api/v1/categories")
        resp.raise_for_status()
        categories = resp.json().get("data", [])
        for cat in categories:
            if cat.get("code") == code:
                return cat["id"]
        raise ValueError(f"Category not found: {code}")


async def _ensure_repo(full_name: str) -> int:
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        name = full_name.split("/")[-1] if "/" in full_name else full_name
        resp = await client.post(
            "/api/v1/repos",
            params={"name": name, "fullName": full_name},
        )
        resp.raise_for_status()
        return resp.json()["data"]["id"]
