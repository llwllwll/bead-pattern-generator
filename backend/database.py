from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import select
from config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True
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


async def get_db():
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        # Create new tables only (color_palettes, palette_colors)
        # Use checkfirst=True to avoid errors if tables already exist
        from models import ColorPalette, PaletteColor
        await conn.run_sync(ColorPalette.__table__.create, checkfirst=True)
        await conn.run_sync(PaletteColor.__table__.create, checkfirst=True)