import string
import secrets
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.models import ShortURL, ClickAnalytics
from app.schemas import URLCreate

def generate_short_code(length: int = 6) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))

def get_url_by_code(db: Session, code: str):
    return db.query(ShortURL).filter(ShortURL.short_code == code).first()

def get_url_by_id(db: Session, url_id: int):
    return db.query(ShortURL).filter(ShortURL.id == url_id).first()

def create_short_url(db: Session, url_in: URLCreate) -> ShortURL:
    if url_in.custom_code:
        # Check if custom code already exists
        existing = get_url_by_code(db, url_in.custom_code)
        if existing:
            raise ValueError("Custom short code is already taken.")
        short_code = url_in.custom_code
    else:
        # Generate a unique short code
        for _ in range(10):
            short_code = generate_short_code()
            if not get_url_by_code(db, short_code):
                break
        else:
            raise ValueError("Failed to generate a unique short code. Please try again.")

    db_url = ShortURL(original_url=url_in.original_url, short_code=short_code)
    db.add(db_url)
    db.commit()
    db.refresh(db_url)
    return db_url

def get_all_urls(db: Session):
    return db.query(ShortURL).order_by(ShortURL.created_at.desc()).all()

def create_click_analytics(db: Session, url_id: int, browser: str, os: str, device: str, referrer: str, ip_address: str):
    # Increment click count on ShortURL
    db.query(ShortURL).filter(ShortURL.id == url_id).update(
        {ShortURL.clicks_count: ShortURL.clicks_count + 1}
    )
    
    # Create ClickAnalytics record
    click = ClickAnalytics(
        short_url_id=url_id,
        browser=browser,
        os=os,
        device=device,
        referrer=referrer,
        ip_address=ip_address
    )
    db.add(click)
    db.commit()
    db.refresh(click)
    return click

def get_url_analytics(db: Session, url_id: int):
    # Clicks over time (grouped by date in YYYY-MM-DD format)
    clicks_over_time_query = (
        db.query(
            func.strftime("%Y-%m-%d", ClickAnalytics.timestamp).label("date"),
            func.count(ClickAnalytics.id).label("count")
        )
        .filter(ClickAnalytics.short_url_id == url_id)
        .group_by("date")
        .order_by("date")
        .all()
    )
    
    # Browsers
    browsers_query = (
        db.query(ClickAnalytics.browser.label("name"), func.count(ClickAnalytics.id).label("count"))
        .filter(ClickAnalytics.short_url_id == url_id)
        .group_by(ClickAnalytics.browser)
        .order_by(func.count(ClickAnalytics.id).desc())
        .all()
    )

    # OS
    os_query = (
        db.query(ClickAnalytics.os.label("name"), func.count(ClickAnalytics.id).label("count"))
        .filter(ClickAnalytics.short_url_id == url_id)
        .group_by(ClickAnalytics.os)
        .order_by(func.count(ClickAnalytics.id).desc())
        .all()
    )

    # Devices
    devices_query = (
        db.query(ClickAnalytics.device.label("name"), func.count(ClickAnalytics.id).label("count"))
        .filter(ClickAnalytics.short_url_id == url_id)
        .group_by(ClickAnalytics.device)
        .order_by(func.count(ClickAnalytics.id).desc())
        .all()
    )

    # Referrers
    referrers_query = (
        db.query(ClickAnalytics.referrer.label("name"), func.count(ClickAnalytics.id).label("count"))
        .filter(ClickAnalytics.short_url_id == url_id)
        .group_by(ClickAnalytics.referrer)
        .order_by(func.count(ClickAnalytics.id).desc())
        .all()
    )

    # Formatting outputs
    clicks_over_time = [{"date": r.date, "count": r.count} for r in clicks_over_time_query]
    browsers = [{"name": r.name if r.name else "Unknown", "count": r.count} for r in browsers_query]
    os_systems = [{"name": r.name if r.name else "Unknown", "count": r.count} for r in os_query]
    devices = [{"name": r.name if r.name else "Unknown", "count": r.count} for r in devices_query]
    
    referrers = []
    for r in referrers_query:
        name = r.name if r.name else "Direct / Bookmark"
        referrers.append({"name": name, "count": r.count})

    return {
        "clicks_over_time": clicks_over_time,
        "browsers": browsers,
        "os_systems": os_systems,
        "devices": devices,
        "referrers": referrers
    }
