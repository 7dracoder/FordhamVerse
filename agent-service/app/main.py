from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .llm_client import LlmClient
from .models import (
    ProfileSummaryRequest,
    ProfileSummaryResponse,
    QuestStatusRequest,
    QuestStatusResponse,
    TaHintRequest,
    TaHintResponse,
)
from .perseus_client import PerseusClient

app = FastAPI(title="FordhamVerse AI Campus TA", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

perseus = PerseusClient()
llm = LlmClient()


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "fordhamverse-agent"}


@app.post("/api/quest/status", response_model=QuestStatusResponse)
async def quest_status(payload: QuestStatusRequest) -> QuestStatusResponse:
    output = (payload.testOutput or "").lower()
    if "passed" in output or "all tests" in output or "100%" in output:
        return QuestStatusResponse(status="completed", confidence=0.86, reason="Test output indicates a passing quest.")
    if payload.replitProjectUrl or output:
        return QuestStatusResponse(status="in_progress", confidence=0.72, reason="Project or test output exists but completion is not proven.")
    return QuestStatusResponse(status="not_started", confidence=0.64, reason="No project URL or test output was provided.")


@app.post("/api/ta/hint", response_model=TaHintResponse)
async def ta_hint(payload: TaHintRequest) -> TaHintResponse:
    query = " ".join(
        part
        for part in [payload.portalId, payload.question, payload.codeSnapshot, payload.testOutput]
        if part
    )
    results = await perseus.search_code(query, repo_scope=payload.portalId)
    snippets = [await perseus.get_snippet(result) for result in results[:3]]
    hint, concept_tags, next_portal_id = await llm.generate_hint(
        question=payload.question,
        snippets=snippets,
        test_output=payload.testOutput,
    )
    return TaHintResponse(
        hint=hint,
        conceptTags=concept_tags,
        nextPortalId=next_portal_id,
        usedSnippets=snippets,
    )


@app.post("/api/ta/profile-summary", response_model=ProfileSummaryResponse)
async def profile_summary(payload: ProfileSummaryRequest) -> ProfileSummaryResponse:
    evidence = []
    for repo_url in payload.repoUrls:
        results = await perseus.search_code(str(repo_url), repo_scope=payload.playerId)
        evidence.extend(f"{item.repo}/{item.path}:{item.symbol}" for item in results[:2])
    if not evidence:
        evidence = [
            "fordham-frontend-quest/src/App.tsx:React",
            "fordham-data-quest/notebooks/analysis.ipynb:pandas",
            "fordham-api-quest/app/main.py:FastAPI",
        ]
    summary, categories = await llm.summarize_profile(evidence)
    return ProfileSummaryResponse(summary=summary, recommendedCategories=categories, evidence=evidence[:6])
