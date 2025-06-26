"""
Main FastAPI application for TransiGenius backend.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager
import asyncio
import json

from app.core.config import settings
from app.api.routes import traffic, geojson, analysis, project
from app.services.tomtom_service import tomtom_service
from app.websockets import manager # <--- IMPORT FROM THE NEW FILE

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize services and load initial data
    logger.info("Starting TransiGenius Backend")
    
    async def periodic_traffic_update():
        while True:
            await tomtom_service.update_all_traffic_data()
            await asyncio.sleep(settings.TOMTOM_POLLING_INTERVAL)

    # Start background task for periodic traffic updates
    task = asyncio.create_task(periodic_traffic_update())
    try:
        yield
    finally:
        task.cancel()
        logger.info("Shutting down TransiGenius Backend")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Bangalore Multi-layered Transport Network Analysis API",
    version="1.0.0",
    lifespan=lifespan,
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(project.router, prefix=settings.API_V1_STR, tags=["project"])
app.include_router(traffic.router, prefix=settings.API_V1_STR, tags=["traffic"])
app.include_router(geojson.router, prefix=settings.API_V1_STR, tags=["geojson"])
app.include_router(analysis.router, prefix=settings.API_V1_STR, tags=["analysis"])


@app.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; in production, you may want to handle pings or client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
async def root():
    """Root endpoint to check if API is running"""
    return {
        "message": "Welcome to TransiGenius API",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "active",
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
