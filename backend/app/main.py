from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import get_settings
from app.auth.router import router as auth_router
from app.routers.books import router as books_router
from app.routers.borrowings import router as borrowings_router
from app.routers.members import router as members_router
from app.routers.fines import router as fines_router
from app.routers.notifications import router as notifications_router
from app.routers.reservations import router as reservations_router
from app.routers.reviews import router as reviews_router
from app.routers.reading_lists import router as reading_lists_router
from app.routers.settings_router import router as settings_router
from app.routers.activity_log import router as activity_log_router
from app.routers.book_tags import router as book_tags_router
from app.routers.book_requests import router as book_requests_router
from app.routers.reading_challenges import router as reading_challenges_router
from app.routers.waitlist import router as waitlist_router
from app.routers.dashboard import router as dashboard_router
from app.routers.reports import router as reports_router
from app.websocket import websocket_endpoint
from app.services.overdue_service import check_overdue_books
from app.services.email_service import send_due_date_reminders, send_overdue_alerts

settings = get_settings()
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schedule background tasks
    scheduler.add_job(check_overdue_books, "interval", hours=6, id="check_overdue")
    scheduler.add_job(send_due_date_reminders, "cron", hour=8, id="due_reminders")
    scheduler.add_job(send_overdue_alerts, "cron", hour=9, id="overdue_alerts")
    scheduler.start()
    print("ShelfWise API started. Scheduler running.")
    yield
    scheduler.shutdown()
    print("ShelfWise API stopped.")


app = FastAPI(
    title="ShelfWise API",
    version="1.0.0",
    description="Library Management System API",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Register routers
app.include_router(auth_router)
app.include_router(books_router)
app.include_router(borrowings_router)
app.include_router(members_router)
app.include_router(fines_router)
app.include_router(notifications_router)
app.include_router(reservations_router)
app.include_router(reviews_router)
app.include_router(reading_lists_router)
app.include_router(settings_router)
app.include_router(activity_log_router)
app.include_router(book_tags_router)
app.include_router(book_requests_router)
app.include_router(reading_challenges_router)
app.include_router(waitlist_router)
app.include_router(dashboard_router)
app.include_router(reports_router)

# WebSocket
app.add_api_websocket_route("/api/ws/notifications", websocket_endpoint)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "shelfwise-api"}
