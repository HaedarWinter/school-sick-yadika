import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..config import settings
from ..database import get_db
from ..models import GameSession, Score

router = APIRouter(prefix="/api")
class SessionRequest(BaseModel): character: str
class ScoreRequest(BaseModel):
    session_id: uuid.UUID
    character: str
    score: int = Field(ge=0)
    survivalTime: int = Field(ge=0)
    nickname: str = Field(min_length=1, max_length=20)

VALID_CHARACTERS = {
    "akuntan_girl", "akuntan_boy",
    "perhotelan_girl", "perhotelan_boy",
    "pplg_girl", "pplg_boy",
}

@router.post("/session")
async def create_session(body: SessionRequest, db: AsyncSession = Depends(get_db)):
    if body.character not in VALID_CHARACTERS: raise HTTPException(400, "Invalid character")
    session = GameSession(character=body.character, expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.session_ttl_minutes))
    db.add(session); await db.commit()
    return {"session_id": str(session.id)}

@router.get("/leaderboard")
async def leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Score).order_by(Score.score.desc(), Score.created_at.asc()).limit(100))
    return {"scores": [{"nickname": x.nickname, "character": x.character, "score": x.score, "survivalTime": x.survival_time, "created_at": x.created_at} for x in result.scalars()]}

CHARACTER_DISPLAY_NAMES = {
    "akuntan_girl": "Hana",
    "akuntan_boy": "Haru",
    "perhotelan_girl": "Hirara",
    "perhotelan_boy": "Han",
    "pplg_girl": "Havi",
    "pplg_boy": "Hikaru",
}

@router.post("/leaderboard")
async def submit_score(body: ScoreRequest, db: AsyncSession = Depends(get_db)):
    session = await db.get(GameSession, body.session_id)
    if not session: raise HTTPException(401, "Session expired or invalid")
    expires_at = session.expires_at.replace(tzinfo=timezone.utc) if session.expires_at.tzinfo is None else session.expires_at
    if expires_at < datetime.now(timezone.utc): raise HTTPException(401, "Session expired or invalid")
    if session.score_submitted: raise HTTPException(409, "Score already submitted")
    expected = CHARACTER_DISPLAY_NAMES.get(session.character)
    if not expected or body.character != expected: raise HTTPException(400, "Character does not match session")
    nickname = body.nickname.strip()
    if not nickname: raise HTTPException(400, "Nickname is required")
    db.add(Score(session_id=session.id, nickname=nickname, character=expected, score=body.score, survival_time=body.survivalTime))
    session.score_submitted = True; await db.commit()
    return {"success": True}
