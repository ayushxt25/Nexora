from __future__ import annotations

from typing import Any

import requests

from app.config import (
    get_external_search_timeout_seconds,
    get_fact_check_external_max_results,
    get_tavily_api_key,
)

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def tavily_search(query: str, max_results: int | None = None) -> list[dict[str, Any]]:
    api_key = get_tavily_api_key()
    if not api_key:
        return []

    response = requests.post(
        TAVILY_SEARCH_URL,
        json={
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": max_results or get_fact_check_external_max_results(),
            "include_answer": False,
            "include_raw_content": False,
        },
        timeout=get_external_search_timeout_seconds(),
    )
    response.raise_for_status()
    data = response.json()
    return data.get("results", [])
