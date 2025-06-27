"""
GeoJSON API routes for serving geographic data for transport layers.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import json
import logging
from sqlalchemy.orm import Session
from geoalchemy2.functions import ST_AsGeoJSON

from app.core.config import settings
from app.db.models import RoadSegment, BusStop, BusRoute, MetroStation, MetroLine
from app.db import get_db
from app.services.gtfs_service import gtfs_service
from app.services.osm_service import osm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/geojson", tags=["geojson"])


@router.get("/{year}/{data_type}")
async def get_geojson_data(
    year: int,
    data_type: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get GeoJSON data for a specific year and data type from the database.
    
    Args:
        year: Year of the data (e.g., 2013, 2024)
        data_type: Type of data ('road_network', 'bus_stops', 'bus_routes', 
                  'metro_stations', 'metro_lines', 'critical_nodes')
    
    Returns:
        GeoJSON FeatureCollection
    """
    try:
        logger.info(f"Fetching {data_type} data for year {year}")
        
        if data_type == "road_network":
            return await _get_road_network_geojson(db, year)
        elif data_type == "bus_stops":
            return await _get_bus_stops_geojson(db, year)
        elif data_type == "bus_routes":
            return await _get_bus_routes_geojson(db, year)
        elif data_type == "metro_stations":
            return await _get_metro_stations_geojson(db, year)
        elif data_type == "metro_lines":
            return await _get_metro_lines_geojson(db, year)
        elif data_type == "critical_nodes":
            return await _get_critical_nodes_geojson(db, year)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown data type: {data_type}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching {data_type} data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch {data_type} data: {str(e)}"
        )


async def _get_road_network_geojson(db: Session, year: int) -> Dict[str, Any]:
    """Get road network data from database as GeoJSON."""
    try:
        # Query road segments for the specified year
        road_segments = db.query(
            RoadSegment.id,
            RoadSegment.osm_id,
            RoadSegment.name,
            RoadSegment.road_type,
            RoadSegment.lanes,
            ST_AsGeoJSON(RoadSegment.geometry).label('geometry')
        ).filter(RoadSegment.year == year).all()
        
        features = []
        for segment in road_segments:
            if segment.geometry:
                feature = {
                    "type": "Feature",
                    "id": segment.id,
                    "properties": {
                        "osm_id": segment.osm_id,
                        "name": segment.name,
                        "road_type": segment.road_type,
                        "lanes": segment.lanes,
                        "year": year
                    },
                    "geometry": json.loads(segment.geometry)
                }
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "year": year,
                "count": len(features),
                "data_type": "road_network"
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching road network data: {str(e)}")
        # Return empty FeatureCollection instead of raising error
        return {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "year": year,
                "count": 0,
                "data_type": "road_network",
                "error": str(e)
            }
        }


async def _get_bus_stops_geojson(db: Session, year: int) -> Dict[str, Any]:
    """Get bus stops data from database as GeoJSON."""
    try:
        bus_stops = db.query(
            BusStop.id,
            BusStop.stop_id,
            BusStop.name,
            BusStop.code,
            BusStop.description,
            BusStop.zone_id,
            ST_AsGeoJSON(BusStop.geometry).label('geometry')
        ).filter(BusStop.year == year).all()
        
        features = []
        for stop in bus_stops:
            if stop.geometry:
                feature = {
                    "type": "Feature",
                    "id": stop.id,
                    "properties": {
                        "stop_id": stop.stop_id,
                        "name": stop.name,
                        "code": stop.code,
                        "description": stop.description,
                        "zone_id": stop.zone_id,
                        "year": year
                    },
                    "geometry": json.loads(stop.geometry)
                }
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "year": year,
                "count": len(features),
                "data_type": "bus_stops"
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching bus stops data: {str(e)}")
        return {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "year": year,
                "count": 0,
                "data_type": "bus_stops",
                "error": str(e)
            }
        }


async def _get_bus_routes_geojson(db: Session, year: int) -> Dict[str, Any]:
    """Get bus routes data from database as GeoJSON."""
    try:
        bus_routes = db.query(
            BusRoute.id,
            BusRoute.route_id,
            BusRoute.name,
            BusRoute.agency,
            BusRoute.color,
            ST_AsGeoJSON(BusRoute.geometry).label('geometry')
        ).filter(BusRoute.year == year).all()
        
        features = []
        for route in bus_routes:
            if route.geometry:
                feature = {
                    "type": "Feature",
                    "id": route.id,
                    "properties": {
                        "route_id": route.route_id,
                        "name": route.name,
                        "agency": route.agency,
                        "color": route.color,
                        "year": year
                    },
                    "geometry": json.loads(route.geometry)
                }
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "year": year,
                "count": len(features),
                "data_type": "bus_routes"
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching bus routes data: {str(e)}")
        return {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "year": year,
                "count": 0,
                "data_type": "bus_routes",
                "error": str(e)
            }
        }


async def _get_metro_stations_geojson(db: Session, year: int) -> Dict[str, Any]:
    """Get metro stations data from database as GeoJSON."""
    try:
        metro_stations = db.query(
            MetroStation.id,
            MetroStation.station_id,
            MetroStation.name,
            MetroStation.line_id,
            ST_AsGeoJSON(MetroStation.geometry).label('geometry')
        ).filter(MetroStation.year == year).all()
        
        features = []
        for station in metro_stations:
            if station.geometry:
                feature = {
                    "type": "Feature",
                    "id": station.id,
                    "properties": {
                        "station_id": station.station_id,
                        "name": station.name,
                        "line_id": station.line_id,
                        "year": year
                    },
                    "geometry": json.loads(station.geometry)
                }
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "year": year,
                "count": len(features),
                "data_type": "metro_stations"
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching metro stations data: {str(e)}")
        return {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "year": year,
                "count": 0,
                "data_type": "metro_stations",
                "error": str(e)
            }
        }


async def _get_metro_lines_geojson(db: Session, year: int) -> Dict[str, Any]:
    """Get metro lines data from database as GeoJSON."""
    try:
        metro_lines = db.query(
            MetroLine.id,
            MetroLine.line_id,
            MetroLine.name,
            MetroLine.color,
            ST_AsGeoJSON(MetroLine.geometry).label('geometry')
        ).filter(MetroLine.year == year).all()
        
        features = []
        for line in metro_lines:
            if line.geometry:
                feature = {
                    "type": "Feature",
                    "id": line.id,
                    "properties": {
                        "line_id": line.line_id,
                        "name": line.name,
                        "color": line.color,
                        "year": year
                    },
                    "geometry": json.loads(line.geometry)
                }
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "year": year,
                "count": len(features),
                "data_type": "metro_lines"
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching metro lines data: {str(e)}")
        return {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "year": year,
                "count": 0,
                "data_type": "metro_lines",
                "error": str(e)
            }
        }


async def _get_critical_nodes_geojson(db: Session, year: int) -> Dict[str, Any]:
    """Get critical nodes data from graph analysis."""
    try:
        # Import here to avoid circular imports
        from app.services.graph_service import graph_service
        from app.api.routes.analysis import get_critical_nodes
        
        # Get critical nodes from analysis service
        critical_nodes_data = await get_critical_nodes(year=year, db=db)
        
        # Convert to GeoJSON format
        features = []
        if 'nodes' in critical_nodes_data:
            for node in critical_nodes_data['nodes']:
                if 'lat' in node and 'lon' in node:
                    feature = {
                        "type": "Feature",
                        "id": node.get('id', len(features)),
                        "properties": {
                            "node_id": node.get('id', ''),
                            "centrality_score": node.get('centrality_score', 0),
                            "betweenness": node.get('betweenness', 0),
                            "closeness": node.get('closeness', 0),
                            "degree": node.get('degree', 0),
                            "year": year
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [node['lon'], node['lat']]
                        }
                    }
                    features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "year": year,
                "count": len(features),
                "data_type": "critical_nodes"
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching critical nodes data: {str(e)}")
        return {
            "type": "FeatureCollection",
            "features": [],
            "metadata": {
                "year": year,
                "count": 0,
                "data_type": "critical_nodes",
                "error": str(e)
            }
        }
