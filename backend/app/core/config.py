"""
Configuration settings for the TransiGenius backend.
Loads environment variables and provides application settings.
"""

import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

# Get the project root directory
# This points to the 'backend' directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
# This points to the parallel 'Public-Transport-Analysis' directory
PUBLIC_TRANSPORT_ANALYSIS_DIR_PATH = ROOT_DIR.parent / "Public-Transport-Analysis"


class Settings(BaseSettings):
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "TransiGenius"

    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = ["http://localhost:3000", "http://localhost:8000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode='before')
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # TomTom API Configuration
    TOMTOM_API_KEY: str
    TOMTOM_TRAFFIC_FLOW_URL: str = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
    TOMTOM_TRAFFIC_INCIDENTS_URL: str = "https://api.tomtom.com/traffic/services/5/incidentDetails/s3/"

    # Google Maps API Configuration
    GOOGLE_MAPS_API_KEY: str

    # Bangalore Default Bounding Box (approx bounds for the city)
    BANGALORE_BBOX: str = "77.4,12.8,77.8,13.2"  # [minLon, minLat, maxLon, maxLat]

    # Data directories
    DATA_DIR: Path = ROOT_DIR / "data"
    GTFS_DIR: Path = DATA_DIR / "gtfs"
    GEOJSON_DIR: Path = DATA_DIR / "geojson"
    PUBLIC_TRANSPORT_ANALYSIS_DIR: Path = PUBLIC_TRANSPORT_ANALYSIS_DIR_PATH

    # Environment
    ENVIRONMENT: str = "development"

    # API polling frequency in seconds
    TOMTOM_POLLING_INTERVAL: int = 300  # 5 minutes

    # Database
    DATABASE_URL: str

    class Config:
        env_file = ".env"
        case_sensitive = True


# Initialize settings instance
settings = Settings()
