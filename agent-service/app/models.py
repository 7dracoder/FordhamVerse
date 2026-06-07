from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


QuestStatus = Literal["not_started", "in_progress", "completed"]


class QuestStatusRequest(BaseModel):
    playerId: str = Field(min_length=1)
    portalId: str = Field(min_length=1)
    replitProjectUrl: HttpUrl | None = None
    testOutput: str | None = None


class QuestStatusResponse(BaseModel):
    status: QuestStatus
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str


class TaHintRequest(BaseModel):
    playerId: str = Field(min_length=1)
    portalId: str = Field(min_length=1)
    question: str = Field(min_length=1, max_length=3000)
    codeSnapshot: str | None = Field(default=None, max_length=12000)
    testOutput: str | None = Field(default=None, max_length=12000)


class TaHintResponse(BaseModel):
    hint: str
    conceptTags: list[str]
    nextPortalId: str | None = None
    usedSnippets: list[str] = []


class ProfileSummaryRequest(BaseModel):
    playerId: str = Field(min_length=1)
    repoUrls: list[HttpUrl] = []


class ProfileSummaryResponse(BaseModel):
    summary: str
    recommendedCategories: list[str]
    evidence: list[str] = []
