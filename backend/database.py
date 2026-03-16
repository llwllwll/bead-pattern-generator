from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import select, text
from config import settings
import json, time

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args={"ssl": "require"} if "neon" in settings.DATABASE_URL else {}
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()

# region agent log
def _dlog(hypothesisId: str, location: str, message: str, data: dict):
    try:
        with open("debug-5bb0b3.log", "a", encoding="utf-8") as f:
            f.write(
                json.dumps(
                    {
                        "sessionId": "5bb0b3",
                        "runId": "pre-fix",
                        "hypothesisId": hypothesisId,
                        "location": location,
                        "message": message,
                        "data": data,
                        "timestamp": int(time.time() * 1000),
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
    except Exception:
        pass
# endregion agent log


async def get_db():
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    _dlog("H1", "backend/database.py:init_db", "init_db_start", {"db_url_present": bool(settings.DATABASE_URL)})
    async with engine.begin() as conn:
        # Ensure all model tables exist (safe: uses checkfirst internally)
        # Import models to register them on Base.metadata
        import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)

        # Lightweight schema repair for existing databases (no migrations framework)
        # Some environments may already have tables created with an older schema.
        # Add missing columns used by ORM models to prevent runtime 500s.
        alters = [
            "ALTER TABLE IF EXISTS activation_codes ADD COLUMN IF NOT EXISTS used_by UUID",
            "ALTER TABLE IF EXISTS activation_codes ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ",
            "ALTER TABLE IF EXISTS activation_codes ADD COLUMN IF NOT EXISTS price NUMERIC(10,2)",
            "ALTER TABLE IF EXISTS activation_codes ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CNY'",
            "ALTER TABLE IF EXISTS activation_codes ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 1",
            "ALTER TABLE IF EXISTS activation_codes ADD COLUMN IF NOT EXISTS batch_id VARCHAR(50)",
            "ALTER TABLE IF EXISTS activation_codes ADD COLUMN IF NOT EXISTS note TEXT",
        ]
        ok = 0
        for stmt in alters:
            try:
                await conn.execute(text(stmt))
                ok += 1
            except Exception as e:
                _dlog("H1", "backend/database.py:init_db", "schema_repair_failed", {"stmt": stmt, "err": type(e).__name__})
        _dlog("H1", "backend/database.py:init_db", "schema_repair_done", {"ok": ok, "total": len(alters)})