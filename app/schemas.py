from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import List, Optional

class URLCreate(BaseModel):
    original_url: str
    custom_code: Optional[str] = Field(None, min_length=3, max_length=15, pattern=r"^[a-zA-Z0-9_-]+$")

class URLResponse(BaseModel):
    id: int
    original_url: str
    short_code: str
    short_url: str
    created_at: datetime
    clicks_count: int

    class Config:
        from_attributes = True

class ClickDetail(BaseModel):
    timestamp: datetime
    browser: str
    os: str
    device: str
    referrer: Optional[str]
    ip_address: Optional[str]

    class Config:
        from_attributes = True

class StatItem(BaseModel):
    name: str
    count: int

class ClickOverTimeItem(BaseModel):
    date: str
    count: int

class AnalyticsSummary(BaseModel):
    id: int
    original_url: str
    short_code: str
    short_url: str
    created_at: datetime
    clicks_count: int
    clicks_over_time: List[ClickOverTimeItem]
    browsers: List[StatItem]
    os_systems: List[StatItem]
    devices: List[StatItem]
    referrers: List[StatItem]
    clicks: List[ClickDetail]

    class Config:
        from_attributes = True
