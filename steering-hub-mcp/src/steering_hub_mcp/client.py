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
        headers["Authorization"] = f"Bearer {API_KEY}"
    return headers


async def search_steerings(query: str, category_id: Optional[int] = None, limit: int = 10, mode: str = "hybrid", repo: Optional[str] = None, model_name: Optional[str] = None, agent_name: Optional[str] = None) -> tuple[list[dict], Optional[int]]:
    """Call /api/v1/mcp/search with hybrid mode, only returns 'active' steerings.

    Returns:
        Tuple of (results, log_id) where log_id can be used for feedback reporting.
    """
    params: dict[str, Any] = {
        "query": query,
        "limit": limit,
        "mode": mode,
    }
    if category_id:
        params["categoryId"] = category_id
    if repo:
        params["repo"] = repo
    if model_name:
        params["modelName"] = model_name
    if agent_name:
        params["agentName"] = agent_name

    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get("/api/v1/mcp/search", params=params)
        resp.raise_for_status()
        data = resp.json()
        payload = data.get("data", {})
        log_id: Optional[int] = payload.get("logId") if isinstance(payload, dict) else None
        raw_results = payload.get("results", []) if isinstance(payload, dict) else []
        # Filter to active steerings only (should already be filtered server-side)
        results = [r for r in raw_results if r.get("status") == "active"]
        return results, log_id


async def get_steering(steering_id: int) -> dict:
    """Get steering detail by ID"""
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get(f"/api/v1/web/steerings/{steering_id}")
        resp.raise_for_status()
        data = resp.json()
        steering = data.get("data", {})
        if steering.get("status") != "active":
            raise ValueError(f"Steering {steering_id} is not active (status={steering.get('status')})")
        return steering


async def get_categories() -> list[dict]:
    """Get all steering categories"""
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get("/api/v1/web/categories")
        resp.raise_for_status()
        return resp.json().get("data", [])


async def get_all_tags(category_code: Optional[str] = None) -> dict:
    """
    Get tags overview or specific category tags

    Args:
        category_code: Optional category code (e.g. 'coding', 'business')

    Returns:
        - If category_code is None: dict with categories overview (tag_count, steering_count)
        - If category_code provided: dict with category info and tags list
    """
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        if category_code is None:
            # Return categories overview with tag/steering counts
            categories = await get_categories()
            category_stats = []

            for cat in categories:
                if not cat.get("enabled", True):
                    continue

                cat_id = cat["id"]
                # Fetch steerings for this category
                resp = await client.get("/api/v1/web/steerings", params={
                    "page": 1,
                    "size": 200,
                    "categoryId": cat_id
                })
                resp.raise_for_status()
                data = resp.json().get("data", {})
                records = data.get("records", [])

                # Count active steerings and extract tags
                active_steerings = [s for s in records if s.get("status") == "active"]
                tags_set = set()
                for steering in active_steerings:
                    if steering.get("tags"):
                        for tag in steering["tags"]:
                            if tag:
                                tags_set.add(tag)

                category_stats.append({
                    "code": cat.get("code"),
                    "name": cat.get("name"),
                    "tag_count": len(tags_set),
                    "steering_count": len(active_steerings)
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

            # Fetch steerings for this category
            resp = await client.get("/api/v1/web/steerings", params={
                "page": 1,
                "size": 200,
                "categoryId": category["id"]
            })
            resp.raise_for_status()
            data = resp.json().get("data", {})
            records = data.get("records", [])

            # Extract tags from active steerings
            tags_set = set()
            for steering in records:
                if steering.get("status") == "active" and steering.get("tags"):
                    for tag in steering["tags"]:
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


async def submit_steering(title: str, content: str, category: str, tags: list[str]) -> dict:
    """Submit a new steering for human review (creates in DRAFT status)"""
    payload = {
        "title": title,
        "content": content,
        "category": category,
        "tags": tags,
    }
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.post("/api/v1/mcp/steerings", json=payload)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def record_usage(steering_id: int, repo: str, task_description: str, agent_id: str = "mcp-agent") -> dict:
    """Record steering usage from MCP tool call"""
    # Ensure repo is registered
    repo_id = await _ensure_repo(repo)
    payload = {
        "steeringId": steering_id,
        "repoId": repo_id,
        "repoName": repo,
        "taskDescription": task_description,
        "agentId": agent_id,
    }
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.post("/api/v1/web/usage", json=payload)
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _resolve_category_id(code: str) -> int:
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get("/api/v1/web/categories")
        resp.raise_for_status()
        categories = resp.json().get("data", [])
        for cat in categories:
            if cat.get("code") == code:
                return cat["id"]
        raise ValueError(f"Category not found: {code}")


async def _ensure_repo(full_name: str) -> int:
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        name = full_name.split("/")[-1] if "/" in full_name else full_name
        try:
            resp = await client.post(
                "/api/v1/web/repos",
                json={"name": name, "fullName": full_name},
            )
            resp.raise_for_status()
            return resp.json()["data"]["id"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 409:
                # Repo already exists; find it by searching
                search_resp = await client.get("/api/v1/web/repos", params={"name": name, "size": 50})
                search_resp.raise_for_status()
                records = search_resp.json().get("data", {}).get("records", [])
                for r in records:
                    if r.get("fullName") == full_name:
                        return r["id"]
                raise ValueError(f"Repo {full_name} already exists but could not be found in list")
            raise


async def list_categories(parent_id: Optional[int] = None) -> list[dict]:
    """List categories. Omit parent_id (or pass 0) for top-level; pass positive int for direct subcategories."""
    params: dict[str, Any] = {}
    if parent_id is not None and parent_id > 0:
        params["parentId"] = parent_id
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get("/api/v1/mcp/categories", params=params)
        resp.raise_for_status()
        return resp.json().get("data", [])


async def list_steerings(category_id: int, limit: int = 10) -> list[dict]:
    """List active steerings in a category (summary: id, title, tags, updatedAt)."""
    params: dict[str, Any] = {"categoryId": category_id, "limit": max(1, min(50, limit))}
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get("/api/v1/mcp/steerings", params=params)
        resp.raise_for_status()
        return resp.json().get("data", [])


async def report_search_failure(query_id: int, reason: str, expected_topic: str = "") -> None:
    """上报本次检索无效，帮助改进规范系统"""
    payload = {"queryId": query_id, "result": "failure", "reason": reason}
    if expected_topic:
        payload["expectedTopic"] = expected_topic
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=10) as client:
        try:
            await client.post("/api/v1/mcp/search/feedback", json=payload)
        except Exception:
            pass


async def report_search_success(query_id: int) -> None:
    """上报本次检索有效"""
    payload = {"queryId": query_id, "result": "success"}
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=10) as client:
        try:
            await client.post("/api/v1/mcp/search/feedback", json=payload)
        except Exception:
            pass
