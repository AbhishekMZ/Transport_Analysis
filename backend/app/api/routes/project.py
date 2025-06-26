"""
Project metadata and information API endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any

router = APIRouter()

# Project metadata
PROJECT_METADATA = {
    "name": "TransiGenius",
    "description": "Bangalore Multi-layered Transport Network Analysis",
    "version": "1.0.0",
    "data_sources": [
        {
            "name": "BMTC GTFS Data",
            "year": 2013,
            "description": "Bangalore Metropolitan Transport Corporation public transportation data"
        },
        {
            "name": "OpenStreetMap",
            "description": "Road network data for Bangalore"
        },
        {
            "name": "TomTom Traffic API",
            "description": "Real-time traffic flow and incident data"
        }
    ],
    "features": [
        "Network criticality analysis",
        "Real-time traffic monitoring",
        "Disruption simulation",
        "ML-based traffic forecasting",
        "Multi-modal transport analysis"
    ],
    "key_areas": [
        "Central Bangalore",
        "Koramangala",
        "Whitefield",
        "Electronic City",
        "Indiranagar",
        "Marathahalli"
    ]
}

@router.get("/project/metadata")
async def get_project_metadata() -> Dict[str, Any]:
    """
    Get TransiGenius project metadata including description,
    data sources, and features.
    """
    return PROJECT_METADATA

@router.get("/project/statistics")
async def get_project_statistics() -> Dict[str, Any]:
    """
    Get overall statistics about the transport network.
    """
    # In a real implementation, these would be queried from your database
    # or calculated on demand
    return {
        "network_statistics": {
            "total_road_segments": 24738,
            "total_road_length_km": 3250,
            "total_bus_stops": 2847,
            "total_bus_routes": 328,
            "metro_stations": 42,
            "metro_lines": 2,
            "critical_nodes_identified": 156
        },
        "last_updated": "2025-06-26T05:00:00Z"
    }

@router.get("/project/years-available")
async def get_available_years() -> Dict[str, Any]:
    """
    Get the years for which data is available.
    """
    return {
        "years": [2013, 2015, 2018, 2020, 2023, 2025],
        "current_year": 2025,
        "historical_years": [2013, 2015, 2018, 2020, 2023],
        "forecast_years": [2025, 2026, 2027]
    }
