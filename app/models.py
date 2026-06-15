from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ShortURL(Base):
    __tablename__ = "short_urls"

    id = Column(Integer, primary_key=True, index=True)
    original_url = Column(String, nullable=False)
    short_code = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    clicks_count = Column(Integer, default=0)

    clicks = relationship("ClickAnalytics", back_populates="short_url", cascade="all, delete-orphan")


class ClickAnalytics(Base):
    __tablename__ = "click_analytics"

    id = Column(Integer, primary_key=True, index=True)
    short_url_id = Column(Integer, ForeignKey("short_urls.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    browser = Column(String, nullable=False)
    os = Column(String, nullable=False)
    device = Column(String, nullable=False)
    referrer = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)

    short_url = relationship("ShortURL", back_populates="clicks")
