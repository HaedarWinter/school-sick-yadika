import uuid
from datetime import datetime
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


VALID_CHARACTERS = [
    "akuntan_girl", "akuntan_boy",
    "perhotelan_girl", "perhotelan_boy",
    "pplg_girl", "pplg_boy",
]

VALID_DISPLAY_NAMES = ["Hana", "Haru", "Hirara", "Han", "Havi", "Hikaru"]

class GameSession(Base):
    __tablename__ = "game_sessions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    character: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    score_submitted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    __table_args__ = (CheckConstraint(f"character IN ({', '.join(repr(c) for c in VALID_CHARACTERS)})"),)


class Score(Base):
    __tablename__ = "leaderboard_scores"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("game_sessions.id"), unique=True)
    nickname: Mapped[str] = mapped_column(String(20), nullable=False)
    character: Mapped[str] = mapped_column(String(16), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    survival_time: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        CheckConstraint(f"character IN ({', '.join(repr(n) for n in VALID_DISPLAY_NAMES)})"),
        CheckConstraint("score >= 0"),
        CheckConstraint("survival_time >= 0"),
        Index("idx_leaderboard_score", "score", "created_at"),
    )
