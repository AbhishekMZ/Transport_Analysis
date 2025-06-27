"""
Data Ingestion API endpoints for loading GTFS and OSM data.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
from sqlalchemy.orm import Session

from app.services.gtfs_service import gtfs_service
from app.services.osm_service import osm_service
from app.db import get_db
from app.db.models import BusStop, BusRoute, MetroStation, MetroLine, RoadSegment

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingestion", tags=["Data Ingestion"])


class IngestionRequest(BaseModel):
    year: int = 2024
    force_reload: bool = False


class GTFSIngestionRequest(IngestionRequest):
    feed_name: str


class OSMIngestionRequest(IngestionRequest):
    network_type: str = "drive"


class IngestionResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None
    task_id: Optional[str] = None


class DataSummary(BaseModel):
    bus_stops: int
    bus_routes: int
    metro_stations: int
    metro_lines: int
    road_segments: int
    year: int


# In-memory task tracking (in production, use Redis or database)
ingestion_tasks = {}


@router.get("/status", response_model=Dict[str, Any])
async def get_ingestion_status(db: Session = Depends(get_db)):
    """Get current data ingestion status and database statistics."""
    try:
        # Get data counts by year
        years_data = {}
        
        # Query data for recent years
        for year in range(2020, 2026):
            bus_stops = db.query(BusStop).filter(BusStop.year == year).count()
            bus_routes = db.query(BusRoute).filter(BusRoute.year == year).count()
            metro_stations = db.query(MetroStation).filter(MetroStation.year == year).count()
            metro_lines = db.query(MetroLine).filter(MetroLine.year == year).count()
            road_segments = db.query(RoadSegment).filter(RoadSegment.year == year).count()
            
            total = bus_stops + bus_routes + metro_stations + metro_lines + road_segments
            
            if total > 0:
                years_data[str(year)] = {
                    "bus_stops": bus_stops,
                    "bus_routes": bus_routes,
                    "metro_stations": metro_stations,
                    "metro_lines": metro_lines,
                    "road_segments": road_segments,
                    "total": total
                }
        
        # Get available data sources
        gtfs_feeds = gtfs_service.get_available_feeds()
        osm_networks = osm_service.get_available_road_networks()
        
        return {
            "status": "success",
            "database_stats": years_data,
            "available_sources": {
                "gtfs_feeds": len(gtfs_feeds),
                "osm_networks": len(osm_networks)
            },
            "active_tasks": len(ingestion_tasks),
            "gtfs_feeds": gtfs_feeds,
            "osm_networks": osm_networks
        }
        
    except Exception as e:
        logger.error(f"Error getting ingestion status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feeds", response_model=Dict[str, Any])
async def list_available_feeds():
    """List available GTFS feeds and OSM networks."""
    try:
        gtfs_feeds = gtfs_service.get_available_feeds()
        osm_networks = osm_service.get_available_road_networks()
        
        return {
            "gtfs_feeds": gtfs_feeds,
            "osm_networks": osm_networks
        }
        
    except Exception as e:
        logger.error(f"Error listing feeds: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gtfs", response_model=IngestionResponse)
async def ingest_gtfs_data(
    request: GTFSIngestionRequest,
    background_tasks: BackgroundTasks
):
    """Ingest GTFS data from specified feed."""
    try:
        # Check if feed exists
        feeds = gtfs_service.get_available_feeds()
        feed_names = [f['name'] for f in feeds]
        
        if request.feed_name not in feed_names:
            raise HTTPException(
                status_code=404,
                detail=f"Feed '{request.feed_name}' not found. Available feeds: {feed_names}"
            )
        
        # Generate task ID
        task_id = f"gtfs_{request.feed_name}_{request.year}"
        
        # Check if already running
        if task_id in ingestion_tasks and ingestion_tasks[task_id]["status"] == "running":
            return IngestionResponse(
                status="already_running",
                message=f"GTFS ingestion for {request.feed_name} is already in progress",
                task_id=task_id
            )
        
        # Start background task
        ingestion_tasks[task_id] = {"status": "running", "progress": 0}
        background_tasks.add_task(
            _ingest_gtfs_background,
            request.feed_name,
            request.year,
            task_id
        )
        
        return IngestionResponse(
            status="started",
            message=f"GTFS ingestion started for {request.feed_name}",
            task_id=task_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting GTFS ingestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/osm", response_model=IngestionResponse)
async def ingest_osm_data(
    request: OSMIngestionRequest,
    background_tasks: BackgroundTasks
):
    """Ingest OSM road network data."""
    try:
        # Generate task ID
        task_id = f"osm_{request.network_type}_{request.year}"
        
        # Check if already running
        if task_id in ingestion_tasks and ingestion_tasks[task_id]["status"] == "running":
            return IngestionResponse(
                status="already_running",
                message=f"OSM ingestion for {request.network_type} is already in progress",
                task_id=task_id
            )
        
        # Start background task
        ingestion_tasks[task_id] = {"status": "running", "progress": 0}
        background_tasks.add_task(
            _ingest_osm_background,
            request.year,
            request.network_type,
            task_id
        )
        
        return IngestionResponse(
            status="started",
            message=f"OSM ingestion started for {request.network_type} network",
            task_id=task_id
        )
        
    except Exception as e:
        logger.error(f"Error starting OSM ingestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}", response_model=Dict[str, Any])
async def get_task_status(task_id: str):
    """Get status of a specific ingestion task."""
    if task_id not in ingestion_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "task_id": task_id,
        **ingestion_tasks[task_id]
    }


@router.delete("/data/{year}")
async def clear_data_for_year(year: int, db: Session = Depends(get_db)):
    """Clear all data for a specific year."""
    try:
        # Count existing records
        bus_stops_count = db.query(BusStop).filter(BusStop.year == year).count()
        bus_routes_count = db.query(BusRoute).filter(BusRoute.year == year).count()
        metro_stations_count = db.query(MetroStation).filter(MetroStation.year == year).count()
        metro_lines_count = db.query(MetroLine).filter(MetroLine.year == year).count()
        road_segments_count = db.query(RoadSegment).filter(RoadSegment.year == year).count()
        
        total_records = (bus_stops_count + bus_routes_count + metro_stations_count + 
                        metro_lines_count + road_segments_count)
        
        if total_records == 0:
            return {
                "status": "no_data",
                "message": f"No data found for year {year}",
                "deleted_count": 0
            }
        
        # Delete records
        db.query(BusStop).filter(BusStop.year == year).delete()
        db.query(BusRoute).filter(BusRoute.year == year).delete()
        db.query(MetroStation).filter(MetroStation.year == year).delete()
        db.query(MetroLine).filter(MetroLine.year == year).delete()
        db.query(RoadSegment).filter(RoadSegment.year == year).delete()
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"Successfully cleared {total_records} records for year {year}",
            "deleted_count": total_records,
            "breakdown": {
                "bus_stops": bus_stops_count,
                "bus_routes": bus_routes_count,
                "metro_stations": metro_stations_count,
                "metro_lines": metro_lines_count,
                "road_segments": road_segments_count
            }
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error clearing data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _ingest_gtfs_background(feed_name: str, year: int, task_id: str):
    """Background task for GTFS ingestion."""
    try:
        ingestion_tasks[task_id]["progress"] = 10
        result = gtfs_service.process_gtfs_feed(feed_name, year)
        
        ingestion_tasks[task_id].update({
            "status": "completed",
            "progress": 100,
            "result": result
        })
        
    except Exception as e:
        logger.error(f"GTFS background task failed: {e}")
        ingestion_tasks[task_id].update({
            "status": "failed",
            "error": str(e)
        })


async def _ingest_osm_background(year: int, network_type: str, task_id: str):
    """Background task for OSM ingestion."""
    try:
        ingestion_tasks[task_id]["progress"] = 10
        result = osm_service.load_osm_data(year, network_type)
        
        ingestion_tasks[task_id].update({
            "status": "completed",
            "progress": 100,
            "result": result
        })
        
    except Exception as e:
        logger.error(f"OSM background task failed: {e}")
        ingestion_tasks[task_id].update({
            "status": "failed",
            "error": str(e)
        })
