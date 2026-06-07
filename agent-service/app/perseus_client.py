from dataclasses import dataclass
import logging
import os

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CodeSearchResult:
    repo: str
    path: str
    symbol: str
    score: float


class PerseusClient:
    """Thin Perseus-style code search adapter with deterministic offline stubs."""

    def __init__(self) -> None:
        self.api_url = os.getenv("PERSEUS_API_URL")
        self.api_key = os.getenv("PERSEUS_API_KEY")

    async def search_code(self, query: str, repo_scope: str | None = None) -> list[CodeSearchResult]:
        logger.info("perseus.search_code query=%s repo_scope=%s configured=%s", query, repo_scope, bool(self.api_url))
        normalized = query.lower()
        if "binary" in normalized or "search" in normalized:
            return [
                CodeSearchResult("fordham-cs-debugging", "src/binary_search.py", "binary_search", 0.94),
                CodeSearchResult("fordham-cs-debugging", "tests/test_binary_search.py", "test_upper_bound_edge", 0.88),
            ]
        if "react" in normalized or "frontend" in normalized:
            return [
                CodeSearchResult("fordham-frontend-quest", "src/App.tsx", "CampusQuest", 0.91),
                CodeSearchResult("fordham-frontend-quest", "src/hooks/useEvents.ts", "useEvents", 0.83),
            ]
        return [
            CodeSearchResult("fordham-quest-kit", "README.md", "quest_overview", 0.72),
            CodeSearchResult("fordham-quest-kit", "tests/test_smoke.py", "test_smoke", 0.65),
        ]

    async def get_snippet(self, result: CodeSearchResult) -> str:
        logger.info("perseus.get_snippet repo=%s path=%s symbol=%s", result.repo, result.path, result.symbol)
        if "binary_search" in result.path:
            return "def binary_search(items, target):\n    # Check loop bounds and mid update when target is absent.\n"
        if result.path.endswith(".tsx"):
            return "function CampusQuest() {\n  // Keep derived state memoized when props update frequently.\n}\n"
        return f"{result.path}::{result.symbol} relevant quest context"
