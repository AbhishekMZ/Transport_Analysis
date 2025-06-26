"""
GTFS data processing service for parsing and handling GTFS datasets.
"""

import os
import pandas as pd
import zipfile
import logging
from pathlib import Path
import json
import geojson
from typing import Dict, List, Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class GTFSService:
    """
    Service for processing GTFS (General Transit Feed Specification) data.
    Handles parsing, validation, and conversion of GTFS files to formats needed
    for the transport network analysis.
    """

    def __init__(self):
        self.gtfs_dir = settings.GTFS_DIR
        self.geojson_dir = settings.GEOJSON_DIR
        
        # Ensure directories exist
        os.makedirs(self.gtfs_dir, exist_ok=True)
        os.makedirs(self.geojson_dir, exist_ok=True)

    def get_available_feeds(self) -> List[Dict[str, Any]]:
        """
        Get a list of available GTFS feeds in the data directory.
        
        Returns:
            List of dictionaries containing feed metadata
        """
        feeds = []
        
        if not os.path.exists(self.gtfs_dir):
            return feeds
            
        for item in os.listdir(self.gtfs_dir):
            if item.endswith('.zip'):
                try:
                    year = self._extract_year_from_filename(item)
                    feeds.append({
                        "name": item,
                        "path": str(self.gtfs_dir / item),
                        "year": year,
                        "size": os.path.getsize(self.gtfs_dir / item)
                    })
                except Exception as e:
                    logger.warning(f"Error processing GTFS file {item}: {e}")
                    
        return feeds

    def _extract_year_from_filename(self, filename: str) -> int:
        """Extract year from a GTFS filename."""
        # Assuming filenames are in format like "bmtc_2013.zip"
        parts = filename.replace('.zip', '').split('_')
        for part in parts:
            if part.isdigit() and len(part) == 4:  # Year is typically 4 digits
                return int(part)
                
        # Default to 2013 if no year found (since we know we have 2013 data)
        return 2013

    def process_gtfs_feed(self, feed_name: str) -> Dict[str, Any]:
        """
        Process a GTFS feed and extract relevant data.
        
        Args:
            feed_name: Name of the GTFS feed file
            
        Returns:
            Dictionary containing processing results and statistics
        """
        feed_path = self.gtfs_dir / feed_name
        
        if not os.path.exists(feed_path):
            raise FileNotFoundError(f"GTFS feed file not found: {feed_path}")
            
        try:
            # Extract year from filename
            year = self._extract_year_from_filename(feed_name)
            
            # Process the GTFS zip file
            with zipfile.ZipFile(feed_path, 'r') as zip_ref:
                # Read GTFS text files into pandas dataframes
                stops_df = pd.read_csv(zip_ref.open('stops.txt'), dtype=str)
                routes_df = pd.read_csv(zip_ref.open('routes.txt'), dtype=str)
                
                # Try to read optional files, handling if they don't exist
                try:
                    trips_df = pd.read_csv(zip_ref.open('trips.txt'), dtype=str)
                    trip_count = len(trips_df)
                except:
                    trip_count = 0
                
                # Get basic stats
                stats = {
                    "stop_count": len(stops_df),
                    "route_count": len(routes_df),
                    "trip_count": trip_count
                }
                
                # Convert stops to GeoJSON
                stops_geojson = self._stops_to_geojson(stops_df, year)
                
                # Save GeoJSON files
                self._save_geojson(stops_geojson, f"bus_stops_{year}.geojson")
                
                # Try to create route GeoJSON if we have the necessary data
                try:
                    routes_geojson = self._routes_to_geojson(routes_df, stops_df, year)
                    self._save_geojson(routes_geojson, f"bus_routes_{year}.geojson")
                except Exception as e:
                    logger.error(f"Error creating routes GeoJSON: {e}")
                
            return {
                "feed_name": feed_name,
                "year": year,
                "statistics": stats,
                "status": "processed"
            }
            
        except Exception as e:
            logger.error(f"Error processing GTFS feed {feed_name}: {e}")
            return {
                "feed_name": feed_name,
                "status": "error",
                "error": str(e)
            }

    def _stops_to_geojson(self, stops_df: pd.DataFrame, year: int) -> Dict[str, Any]:
        """
        Convert GTFS stops to GeoJSON format.
        
        Args:
            stops_df: DataFrame containing GTFS stops.txt data
            year: Year of the data
            
        Returns:
            GeoJSON FeatureCollection
        """
        features = []
        
        for _, row in stops_df.iterrows():
            # Skip rows with invalid coordinates
            try:
                stop_lat = float(row['stop_lat'])
                stop_lon = float(row['stop_lon'])
            except (ValueError, KeyError):
                continue
                
            if not (-90 <= stop_lat <= 90 and -180 <= stop_lon <= 180):
                continue
                
            # Create GeoJSON feature
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [stop_lon, stop_lat]
                },
                "properties": {
                    "id": row.get('stop_id', ''),
                    "name": row.get('stop_name', ''),
                    "code": row.get('stop_code', ''),
                    "description": row.get('stop_desc', ''),
                    "zone_id": row.get('zone_id', ''),
                    "year": year
                }
            }
            
            features.append(feature)
            
        return {
            "type": "FeatureCollection",
            "features": features
        }

    def _routes_to_geojson(self, routes_df: pd.DataFrame, stops_df: pd.DataFrame, year: int) -> Dict[str, Any]:
        """
        Convert GTFS routes to GeoJSON format.
        This is a simplified version that creates straight lines between stops.
        In production, you would use shapes.txt for actual route geometries.
        
        Args:
            routes_df: DataFrame containing GTFS routes.txt data
            stops_df: DataFrame containing GTFS stops.txt data
            year: Year of the data
            
        Returns:
            GeoJSON FeatureCollection
        """
        # This is a simplified placeholder
        # In a real implementation, you would use shapes.txt or
        # construct the route geometries from stop sequences
        
        features = []
        
        # Create a simple route feature for each route
        for _, route in routes_df.iterrows():
            route_id = route.get('route_id', '')
            route_name = route.get('route_long_name', route.get('route_short_name', ''))
            
            # Create a placeholder line for the route
            # In reality, you'd connect the actual stops in sequence
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[77.5946, 12.9716], [77.6033, 12.9783]]  # Placeholder coordinates
                },
                "properties": {
                    "id": route_id,
                    "name": route_name,
                    "type": route.get('route_type', ''),
                    "agency": route.get('agency_id', ''),
                    "color": f"#{route.get('route_color', 'FFFFFF')}",
                    "year": year
                }
            }
            
            features.append(feature)
            
        return {
            "type": "FeatureCollection",
            "features": features
        }

    def _save_geojson(self, data: Dict[str, Any], filename: str) -> None:
        """
        Save GeoJSON data to file.
        
        Args:
            data: GeoJSON data dictionary
            filename: Target filename
        """
        filepath = self.geojson_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(data, f)
            
        logger.info(f"Saved GeoJSON file: {filepath}")


# Create singleton instance
gtfs_service = GTFSService()
