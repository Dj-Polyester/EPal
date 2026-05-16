import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base


class Media(Base):
    __tablename__ = "media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.id"), nullable=True)
    character_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True)
    media_type = Column(String(20), nullable=False)  # image, video, audio
    prompt = Column(Text, nullable=False)
    url = Column(String(500), nullable=False)
    status = Column(String(20), default="completed")  # pending, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
