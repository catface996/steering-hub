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


async def search_steerings(query: str, category_id: Optional[int] = None, limit: int = 10, mode: str = "hybrid") -> list[dict]:
    """Call /api/v1/search with hybrid mode, only returns 'active' steerings"""
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
        # Filter to active steerings only (should already be filtered server-side)
        results = data.get("data", [])
        return [r for r in results if r.get("status") == "active"]


async def get_steering(steering_id: int) -> dict:
    """Get steering detail by ID"""
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.get(f"/api/v1/steerings/{steering_id}")
        resp.raise_for_status()
        data = resp.json()
        steering = data.get("data", {})
        if steering.get("status") != "active":
            raise ValueError(f"Steering {steering_id} is not active (status={steering.get('status')})")
        return steering


async def get_categories() -> list[dict]:
    """Get all steering categories"""
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
                resp = await client.get("/api/v1/steerings", params={
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
            resp = await client.get("/api/v1/steerings", params={
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
    # Resolve category id from code
    category_id = await _resolve_category_id(category)
    payload = {
        "title": title,
        "content": content,
        "categoryId": category_id,
        "tags": tags,
    }
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=30) as client:
        resp = await client.post("/api/v1/steerings", json=payload)
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


async def log_search_query(
    query: str,
    mode: str,
    results: list,
    agent_id: str = "mcp-agent",
    repo: str = "",
    task_description: str = "",
    response_time_ms: int = 0,
) -> int:
    """记录 MCP 搜索查询日志，返回 log_id 供后续上报失败/成功使用"""
    import json as _json
    payload = {
        "queryText": query,
        "searchMode": mode,
        "resultCount": len(results),
        "resultSteeringIds": _json.dumps([r.get("steeringId") for r in results if r.get("steeringId")]),
        "agentId": agent_id,
        "repo": repo,
        "taskDescription": task_description,
        "responseTimeMs": response_time_ms,
    }
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=5) as client:
        try:
            resp = await client.post("/api/v1/search/log", json=payload)
            return resp.json().get("data", {}).get("id", 0)
        except Exception:
            return 0  # 日志记录失败不影响搜索结果


async def report_search_failure(log_id: int, reason: str, expected_topic: str = "") -> None:
    """上报本次检索无效，帮助改进规范系统"""
    payload = {"logId": log_id, "reason": reason, "expectedTopic": expected_topic}
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=10) as client:
        try:
            await client.post("/api/v1/search/report-failure", json=payload)
        except Exception:
            pass


async def report_search_success(log_id: int) -> None:
    """上报本次检索有效"""
    async with httpx.AsyncClient(base_url=API_BASE_URL, headers=_get_headers(), timeout=10) as client:
        try:
            await client.post("/api/v1/search/report-success", json={"logId": log_id})
        except Exception:
            pass
