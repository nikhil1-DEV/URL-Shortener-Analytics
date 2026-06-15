import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models

# Recreate tables (or ensure they exist)
Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

# Seed URLs data
sample_urls = [
    {
        "original_url": "https://fastapi.tiangolo.com/tutorial/bigger-applications/",
        "short_code": "fastapi",
        "clicks_count": 0
    },
    {
        "original_url": "https://news.ycombinator.com",
        "short_code": "y-news",
        "clicks_count": 0
    },
    {
        "original_url": "https://github.com/google/jax",
        "short_code": "jax-lib",
        "clicks_count": 0
    }
]

db_urls = []
for item in sample_urls:
    existing = db.query(models.ShortURL).filter(models.ShortURL.short_code == item["short_code"]).first()
    if not existing:
        url = models.ShortURL(original_url=item["original_url"], short_code=item["short_code"])
        db.add(url)
        db.commit()
        db.refresh(url)
        db_urls.append(url)
    else:
        db_urls.append(existing)

# Setup lists of mock properties
browsers = ["Chrome 124", "Chrome 124", "Safari 17", "Firefox 125", "Edge 123", "Mobile Safari 17"]
os_list = ["Windows 11", "macOS 14", "Linux", "iOS 17", "Android 14"]
devices = ["Desktop", "Desktop", "Mobile", "Mobile", "Tablet"]
referrers = ["github.com", "t.co", "news.ycombinator.com", "google.com", None]
ips = ["192.168.1.50", "82.165.10.4", "204.79.197.200", "8.8.8.8", "142.250.190.46"]

# Generate clicks for the last 7 days
now = datetime.utcnow()
click_count_total = 0

for url in db_urls:
    # Generate 15 to 45 clicks for each URL
    num_clicks = random.randint(15, 45)
    for _ in range(num_clicks):
        # Pick a random date in the last 7 days
        days_ago = random.randint(0, 6)
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        click_time = now - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
        
        click = models.ClickAnalytics(
            short_url_id=url.id,
            timestamp=click_time,
            browser=random.choice(browsers),
            os=random.choice(os_list),
            device=random.choice(devices),
            referrer=random.choice(referrers),
            ip_address=random.choice(ips)
        )
        db.add(click)
        click_count_total += 1
    
    # Update count
    url.clicks_count = num_clicks

db.commit()
db.close()

print(f"Database seeded successfully with {len(db_urls)} URLs and {click_count_total} click analytics events!")
