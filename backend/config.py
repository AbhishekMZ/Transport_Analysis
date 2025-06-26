# backend/config.py

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Manages application settings and secrets.
    Reads variables from a .env file.
    """
    TOMTOM_API_KEY: str = "YOUR_DEFAULT_KEY"

    # Define the bounding box for Bangalore for TomTom API calls
    # Format: min_lat, min_lon, max_lat, max_lon
    BANGALORE_BBOX: str = "12.83,77.46,13.14,77.78"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Create a single instance of the settings to be used across the application
settings = Settings()

