from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import init_db
from routers.auth import router as auth_router
from routers.activation import router as activation_router
from routers.pattern import router as pattern_router
from routers.admin import router as admin_router
from routers.palette import router as palette_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    try:
        await init_db()
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Server will start without database connection")
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="拼豆图纸生成器后端API - 支持用户认证、激活码验证和权限管理",
    docs_url="/docs",
    redoc_url="/redoc",
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,
        "defaultModelExpandDepth": 3,
        "docExpansion": "none",
        "filter": True,
        "language": "zh-CN"
    },
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(activation_router)
app.include_router(pattern_router)
app.include_router(admin_router)
app.include_router(palette_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Bead Pattern Generator API",
        "version": settings.APP_VERSION,
        "docs_url": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)