"""
GeoJSON data API endpoints for map visualization.
Integrates with Public-Transport-Analysis GeoJSON files.
"""

from fastapi import APIRouter, HTTPException, Path
import json
import os
from pathlib import Path as FilePath
from typing import Dict, Any, Optional

from app.core.config import settings

router = APIRouter()

# Define available data types
VALID_DATA_TYPES = [
    "road_network",
    "bus_stops",
    "bus_routes",
    "metro_stations",
    "metro_lines",
    "critical_nodes"
]

def get_geojson_file_path(year: int, data_type: str) -> Optional[FilePath]:
    """
    Construct the file path for a specific GeoJSON data file, checking multiple locations.
    """
    # Use paths from the settings object
    geojson_dir = settings.GEOJSON_DIR
    public_transport_dir = settings.PUBLIC_TRANSPORT_ANALYSIS_DIR

    # Try the standard format in the geojson directory
    file_name = f"{data_type}_{year}.geojson"
    file_path = geojson_dir / file_name
    if os.path.exists(file_path):
        return file_path

    # Check in Public-Transport-Analysis directory for yearly data files
    year_file = public_transport_dir / f"data_{year}.geojson"
    if os.path.exists(year_file):
        return year_file

    # Check for specialized datasets (bus stops or metro stations)
    if data_type == "bus_stops":
        special_file = public_transport_dir / "ProjectOSM" / "data" / "osm_snapshots" / f"{year}_bus.geojson"
        if os.path.exists(special_file):
            return special_file
    elif data_type == "metro_stations":
        special_file = public_transport_dir / "ProjectOSM" / "data" / "osm_snapshots" / f"{year}_metro.geojson"
        if os.path.exists(special_file):
            return special_file

    return None


@router.get("/geojson/available")
async def list_available_geojson_data() -> Dict[str, Any]:
    """
    List available GeoJSON data files by year and data type.
    """
    available_data = {}
    geojson_dir = settings.GEOJSON_DIR
    public_transport_dir = settings.PUBLIC_TRANSPORT_ANALYSIS_DIR

    # Scan the directory for GeoJSON files
    if os.path.exists(geojson_dir):
        for file_path in os.listdir(geojson_dir):
            if file_path.endswith(".geojson"):
                try:
                    parts = file_path.replace(".geojson", "").split("_")
                    if len(parts) >= 2:
                        data_type = "_".join(parts[:-1])
                        year_str = parts[-1]

                        if year_str.isdigit() and data_type in VALID_DATA_TYPES:
                            year = int(year_str)
                            if year not in available_data:
                                available_data[year] = []
                            if data_type not in available_data[year]:
                                available_data[year].append(data_type)
                except Exception:
                    pass
    
    # Add logic to scan other directories if needed...

    return {
        "available_data": {str(year): data_types for year, data_types in available_data.items()},
        "valid_data_types": VALID_DATA_TYPES
    }


@router.get("/geojson/{year}/{data_type}")
async def get_geojson_data(
    year: int = Path(..., description="Year of data"),
    data_type: str = Path(..., description="Type of GeoJSON data")
) -> Dict[str, Any]:
    """
    Get GeoJSON data for a specific year and data type.
    """
    if data_type not in VALID_DATA_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid data type. Valid types: {', '.join(VALID_DATA_TYPES)}"
        )

    file_path = get_geojson_file_path(year, data_type)

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"GeoJSON data not found for year {year} and type {data_type}")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        return geojson_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading GeoJSON file: {str(e)}"
        )
