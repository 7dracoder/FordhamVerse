import logging
import os

logger = logging.getLogger(__name__)


class LlmClient:
    """LLM abstraction. Uses deterministic local reasoning until credentials are supplied."""

    def __init__(self) -> None:
        self.api_key = os.getenv("LLM_API_KEY")
        self.model = os.getenv("LLM_MODEL", "local-deterministic")

    async def generate_hint(
        self,
        *,
        question: str,
        snippets: list[str],
        test_output: str | None,
    ) -> tuple[str, list[str], str | None]:
        logger.info("llm.generate_hint model=%s configured=%s", self.model, bool(self.api_key))
        joined = "\n".join([question, test_output or "", *snippets]).lower()
        if "binary" in joined or "off" in joined or "index" in joined:
            return (
                "Check the loop boundary and how `mid` changes after each comparison. Tests 3 and 4 likely hit the missing-target or last-element case.",
                ["binary_search", "off_by_one", "loop_invariant"],
                "portal-systems-debugging",
            )
        if "async" in joined or "fetch" in joined:
            return (
                "Separate loading, success, and error states. Await the request before reading response data, then render from one source of truth.",
                ["async", "state_management", "react"],
                "portal-frontend-events",
            )
        if "sql" in joined or "join" in joined:
            return (
                "Start from the table with the one row per output item, then join outward. Check whether your filter belongs in `ON` or `WHERE`.",
                ["sql_joins", "data_modeling"],
                "portal-data-analytics",
            )
        return (
            "Find the smallest failing case, read the expected value, and trace the variables once by hand. Patch that path before generalizing.",
            ["debugging", "testing"],
            None,
        )

    async def summarize_profile(self, evidence: list[str]) -> tuple[str, list[str]]:
        logger.info("llm.summarize_profile model=%s configured=%s", self.model, bool(self.api_key))
        text = " ".join(evidence).lower()
        categories: list[str] = []
        if "react" in text or "tsx" in text:
            categories.append("frontend")
        if "pandas" in text or "sql" in text:
            categories.append("data")
        if "fastapi" in text or "docker" in text:
            categories.append("infra")
        if not categories:
            categories = ["general", "frontend", "data"]
        summary = "Your projects show strong debugging instincts and growing product sense. Next best move: ship one small polished quest, then deepen the category with tests."
        return summary, categories[:3]
