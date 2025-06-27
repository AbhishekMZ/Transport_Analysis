"""
Data ingestion API routes for loading GTFS and OSM data into the database.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, Optional
import logging

from app.services.gtfs_service import gtfs_service
from app.services.osm_service import osm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data", tags=["data-ingestion"])


@router.post("/load-gtfs/{feed_name}")
async def load_gtfs_data(
    feed_name: str,
    background_tasks: BackgroundTasks,
    year: Optional[int] = None
) -> Dict[str, Any]:
    """
    Load GTFS data from a feed file into the database.
    
    Args:
        feed_name: Name of the GTFS feed file (e.g., 'bmtc.zip')
        year: Year of the data (extracted from filename if not provided)
    
    Returns:
        Processing statistics or task status
    """
    try:
        logger.info(f"Starting GTFS data loading for feed: {feed_name}")
        
        # Run in background to avoid timeout for large datasets
        background_tasks.add_task(
            _load_gtfs_background,
            feed_name,
            year
        )
        
        return {
            "status": "started",
            "message": f"GTFS data loading started for {feed_name}",
            "feed_name": feed_name,
            "year": year
        }
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"GTFS feed not found: {feed_name}"
        )
    except Exception as e:
        logger.error(f"Error starting GTFS data loading: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start GTFS data loading: {str(e)}"
        )


@router.post("/load-osm/{year}")
async def load_osm_data(
    year: int,
    background_tasks: BackgroundTasks,
    network_type: str = "drive"
) -> Dict[str, Any]:
    """
    Load OSM road network data for a specific year.
    
    Args:
        year: Year for the road network data
        network_type: Type of network ('drive', 'walk', 'bike', 'all_private')
    
    Returns:
        Processing statistics or task status
    """
    try:
        logger.info(f"Starting OSM data loading for year: {year}")
        
        # Run in background to avoid timeout for large datasets
        background_tasks.add_task(
            _load_osm_background,
            year,
            network_type
        )
        
        return {
            "status": "started",
            "message": f"OSM data loading started for year {year}",
            "year": year,
            "network_type": network_type
        }
        
    except Exception as e:
        logger.error(f"Error starting OSM data loading: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start OSM data loading: {str(e)}"
        )


@router.get("/available-feeds")
async def get_available_feeds() -> Dict[str, Any]:
    """
    Get list of available GTFS feeds and road network data.
    
    Returns:
        Dictionary containing available data sources
    """
    try:
        gtfs_feeds = gtfs_service.get_available_feeds()
        road_networks = osm_service.get_available_road_networks()
        
        return {
            "gtfs_feeds": gtfs_feeds,
            "road_networks": road_networks,
            "total_feeds": len(gtfs_feeds),
            "total_networks": len(road_networks)
        }
        
    except Exception as e:
        logger.error(f"Error getting available feeds: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get available feeds: {str(e)}"
        )


@router.post("/load-sample-data/{year}")
async def load_sample_data(
    year: int,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Load sample transport data for testing and development.
    
    Args:
        year: Year for the sample data
    
    Returns:
        Task status
    """
    try:
        logger.info(f"Starting sample data loading for year: {year}")
        
        # Load sample road network and bus data
        background_tasks.add_task(
            _load_sample_data_background,
            year
        )
        
        return {
            "status": "started",
            "message": f"Sample data loading started for year {year}",
            "year": year,
            "includes": ["road_network", "bus_stops", "bus_routes"]
        }
        
    except Exception as e:
        logger.error(f"Error starting sample data loading: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start sample data loading: {str(e)}"
        )


# Background task functions
async def _load_gtfs_background(feed_name: str, year: Optional[int]):
    """Background task for GTFS data loading."""
    try:
        stats = gtfs_service.process_gtfs_feed(feed_name, year)
        logger.info(f"GTFS data loading completed: {stats}")
    except Exception as e:
        logger.error(f"GTFS data loading failed: {str(e)}")


async def _load_osm_background(year: int, network_type: str):
    """Background task for OSM data loading."""
    try:
        stats = osm_service.load_osm_data(year, network_type)
        logger.info(f"OSM data loading completed: {stats}")
    except Exception as e:
        logger.error(f"OSM data loading failed: {str(e)}")


async def _load_sample_data_background(year: int):
    """Background task for sample data loading."""
    try:
        # Load sample road network
        road_stats = osm_service._generate_and_insert_sample_data(year)
        logger.info(f"Sample road data loading completed: {road_stats}")
        
        # Note: Could also load sample GTFS data here if needed
        
    except Exception as e:
        logger.error(f"Sample data loading failed: {str(e)}")
