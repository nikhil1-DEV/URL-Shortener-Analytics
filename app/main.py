import os
from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import RedirectResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from urllib.parse import urlparse
from user_agents import parse

from app.database import engine, get_db
from app import models, schemas, crud

# Create database tables if they do not exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Premium URL Shortener API",
    description="Backend API for URL Shortening and Analytics tracking.",
    version="1.0.0"
)

# Enable CORS for convenience
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# Helper function to helper construct full short URLs
def build_short_url(request: Request, short_code: str) -> str:
    base_url = str(request.base_url)
    # Ensure base_url does not end with a trailing slash for aesthetics
    if base_url.endswith("/"):
        base_url = base_url[:-1]
    return f"{base_url}/{short_code}"

# Background task to record click analytics asynchronously to make redirection fast
def log_click_task(
    db_session_factory, 
    url_id: int, 
    user_agent_str: str, 
    referrer: str, 
    ip_address: str
):
    db = db_session_factory()
    try:
        # Parse User Agent
        ua = parse(user_agent_str)
        browser = ua.browser.family if ua.browser.family else "Unknown"
        # Add version if available to make it detailed (e.g., Chrome 124)
        if ua.browser.version_string:
            major_version = ua.browser.version_string.split(".")[0]
            browser = f"{browser} {major_version}"
            
        os_name = ua.os.family if ua.os.family else "Unknown"
        
        # Determine device
        if ua.is_mobile:
            device = "Mobile"
        elif ua.is_tablet:
            device = "Tablet"
        elif ua.is_pc:
            device = "Desktop"
        elif ua.is_bot:
            device = "Bot"
        else:
            device = "Other"
            
        # Parse referrer host for clean analytics UI
        referrer_host = None
        if referrer:
            try:
                parsed = urlparse(referrer)
                referrer_host = parsed.netloc if parsed.netloc else referrer
            except Exception:
                referrer_host = referrer
        
        crud.create_click_analytics(
            db=db,
            url_id=url_id,
            browser=browser,
            os=os_name,
            device=device,
            referrer=referrer_host,
            ip_address=ip_address
        )
    finally:
        db.close()


# --- API Endpoints ---

@app.post("/api/shorten", response_model=schemas.URLResponse)
def create_shortened_url(
    url_in: schemas.URLCreate, 
    request: Request, 
    db: Session = Depends(get_db)
):
    # Validate original URL format loosely
    url_str = url_in.original_url.strip()
    if not (url_str.startswith("http://") or url_str.startswith("https://")):
        url_str = "https://" + url_str
        url_in.original_url = url_str

    try:
        db_url = crud.create_short_url(db=db, url_in=url_in)
        return schemas.URLResponse(
            id=db_url.id,
            original_url=db_url.original_url,
            short_code=db_url.short_code,
            short_url=build_short_url(request, db_url.short_code),
            created_at=db_url.created_at,
            clicks_count=db_url.clicks_count
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/urls", response_model=list[schemas.URLResponse])
def read_all_urls(request: Request, db: Session = Depends(get_db)):
    db_urls = crud.get_all_urls(db=db)
    return [
        schemas.URLResponse(
            id=url.id,
            original_url=url.original_url,
            short_code=url.short_code,
            short_url=build_short_url(request, url.short_code),
            created_at=url.created_at,
            clicks_count=url.clicks_count
        )
        for url in db_urls
    ]


@app.get("/api/analytics/{short_code}", response_model=schemas.AnalyticsSummary)
def read_url_analytics(short_code: str, request: Request, db: Session = Depends(get_db)):
    db_url = crud.get_url_by_code(db=db, code=short_code)
    if not db_url:
        raise HTTPException(status_code=404, detail="Short URL not found")
        
    stats = crud.get_url_analytics(db=db, url_id=db_url.id)
    
    # Get recent individual clicks details
    click_details = [
        schemas.ClickDetail(
            timestamp=click.timestamp,
            browser=click.browser,
            os=click.os,
            device=click.device,
            referrer=click.referrer,
            ip_address=click.ip_address
        )
        for click in db_url.clicks[-10:] # Return last 10 clicks
    ]
    # Reverse to show newest clicks first
    click_details.reverse()

    return schemas.AnalyticsSummary(
        id=db_url.id,
        original_url=db_url.original_url,
        short_code=db_url.short_code,
        short_url=build_short_url(request, db_url.short_code),
        created_at=db_url.created_at,
        clicks_count=db_url.clicks_count,
        clicks_over_time=stats["clicks_over_time"],
        browsers=stats["browsers"],
        os_systems=stats["os_systems"],
        devices=stats["devices"],
        referrers=stats["referrers"],
        clicks=click_details
    )


# --- Redirection & Static Pages Router ---

# Redirection Endpoint
@app.get("/{short_code}")
def redirect_to_original(
    short_code: str, 
    request: Request, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    db_url = crud.get_url_by_code(db=db, code=short_code)
    if not db_url:
        # If the code is not in the database, raise 404
        raise HTTPException(status_code=404, detail="Shortened URL not found")

    # Record analytics in a background task so the redirect remains ultra-fast
    user_agent = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")
    # Try to grab real IP behind proxy if available, fallback to client host
    ip_address = request.headers.get("x-forwarded-for", "")
    if ip_address:
        ip_address = ip_address.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else "127.0.0.1"

    # We import SessionLocal directly to run in background thread safely
    from app.database import SessionLocal
    background_tasks.add_task(
        log_click_task,
        SessionLocal,
        db_url.id,
        user_agent,
        referrer,
        ip_address
    )

    return RedirectResponse(url=db_url.original_url)


# Mount the static files folder.
# We place this at the end so that it doesn't hijack /{short_code} routing
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", response_class=HTMLResponse)
def serve_dashboard():
    # Helper to return the dashboard page directly at the root path
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>URL Shortener is running. Dashboard index.html not found.</h1>")
