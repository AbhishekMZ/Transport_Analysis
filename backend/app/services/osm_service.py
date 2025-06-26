"""
OpenStreetMap (OSM) data processing service.
"""

import os
import logging
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import random

from app.core.config import settings

logger = logging.getLogger(__name__)


class OSMService:
    """
    Service for processing OpenStreetMap data.
    Handles extraction of road networks and conversion to graph structures.
    
    Note: For production use, this would use osmnx and networkx libraries.
    This implementation provides placeholder functionality for development.
    """

    def __init__(self):
        self.geojson_dir = settings.GEOJSON_DIR
        
        # Ensure directories exist
        os.makedirs(self.geojson_dir, exist_ok=True)
        
        # Bangalore center coordinates
        self.bangalore_center = (77.5946, 12.9716)  # (lon, lat)
        self.bangalore_bbox = [77.4, 12.8, 77.8, 13.2]  # [minLon, minLat, maxLon, maxLat]

    def get_available_road_networks(self) -> List[Dict[str, Any]]:
        """
        Get a list of available road network data files.
        
        Returns:
            List of dictionaries containing road network metadata
        """
        networks = []
        
        if not os.path.exists(self.geojson_dir):
            return networks
            
        for item in os.listdir(self.geojson_dir):
            if item.startswith('road_network_') and item.endswith('.geojson'):
                try:
                    year = int(item.replace('road_network_', '').replace('.geojson', ''))
                    networks.append({
                        "name": item,
                        "path": str(self.geojson_dir / item),
                        "year": year,
                        "size": os.path.getsize(self.geojson_dir / item)
                    })
                except Exception as e:
                    logger.warning(f"Error processing road network file {item}: {e}")
                    
        return networks

    def generate_sample_road_network(self, year: int, save: bool = True) -> Dict[str, Any]:
        """
        Generate a sample road network as GeoJSON.
        For development and testing purposes.
        
        Args:
            year: The year for the road network data
            save: Whether to save the generated data to file
            
        Returns:
            GeoJSON FeatureCollection for the road network
        """
        # In a real implementation, this would use osmnx to download and process OSM data
        # For development, we'll generate a sample grid network
        
        features = []
        
        # Generate a grid of roads centered on Bangalore
        center_lon, center_lat = self.bangalore_center
        grid_size = 10  # 10x10 grid
        cell_size = 0.01  # ~1km
        
        # Roads running east-west (horizontal)
        for i in range(grid_size):
            lat = center_lat - (grid_size/2 * cell_size) + (i * cell_size)
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [center_lon - (grid_size/2 * cell_size), lat],
                        [center_lon + (grid_size/2 * cell_size), lat]
                    ]
                },
                "properties": {
                    "id": f"road_ew_{i}",
                    "name": f"Road EW {i}",
                    "type": self._get_random_road_type(),
                    "lanes": random.randint(1, 4),
                    "year": year
                }
            }
            features.append(feature)
        
        # Roads running north-south (vertical)
        for i in range(grid_size):
            lon = center_lon - (grid_size/2 * cell_size) + (i * cell_size)
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [lon, center_lat - (grid_size/2 * cell_size)],
                        [lon, center_lat + (grid_size/2 * cell_size)]
                    ]
                },
                "properties": {
                    "id": f"road_ns_{i}",
                    "name": f"Road NS {i}",
                    "type": self._get_random_road_type(),
                    "lanes": random.randint(1, 4),
                    "year": year
                }
            }
            features.append(feature)
        
        # Add some diagonal major roads (arterials)
        diagonals = [
            {
                "id": "mg_road",
                "name": "MG Road",
                "type": "primary",
                "lanes": 4,
                "coords": [
                    [center_lon - 0.04, center_lat - 0.02],
                    [center_lon + 0.04, center_lat + 0.01]
                ]
            },
            {
                "id": "airport_road",
                "name": "Airport Road",
                "type": "trunk",
                "lanes": 6,
                "coords": [
                    [center_lon - 0.03, center_lat + 0.03],
                    [center_lon + 0.05, center_lat - 0.04]
                ]
            },
            {
                "id": "outer_ring_road",
                "name": "Outer Ring Road",
                "type": "primary",
                "lanes": 4,
                "coords": [
                    [center_lon - 0.05, center_lat],
                    [center_lon, center_lat - 0.05],
                    [center_lon + 0.05, center_lat]
                ]
            }
        ]
        
        for road in diagonals:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": road["coords"]
                },
                "properties": {
                    "id": road["id"],
                    "name": road["name"],
                    "type": road["type"],
                    "lanes": road["lanes"],
                    "year": year
                }
            }
            features.append(feature)
        
        # Create the GeoJSON structure
        geojson_data = {
            "type": "FeatureCollection",
            "features": features
        }
        
        # Save to file if requested
        if save:
            self._save_geojson(geojson_data, f"road_network_{year}.geojson")
        
        return geojson_data

    def _get_random_road_type(self) -> str:
        """Return a random road type for sample data."""
        road_types = [
            "motorway", "trunk", "primary", "secondary", 
            "tertiary", "residential", "unclassified"
        ]
        weights = [5, 10, 20, 30, 20, 10, 5]  # Weighted probabilities
        return random.choices(road_types, weights=weights)[0]

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

    def extract_nodes_from_road_network(self, geojson_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract nodes (intersections) from a road network.
        
        Args:
            geojson_data: Road network GeoJSON data
            
        Returns:
            GeoJSON FeatureCollection of nodes/intersections
        """
        # This is a simplified placeholder implementation
        # In a real application, you would use proper geometric calculations to find intersections
        
        # For now, we'll just use the start/end points of each road
        nodes = {}  # Use a dict to deduplicate nodes
        
        for feature in geojson_data["features"]:
            if feature["geometry"]["type"] == "LineString":
                coords = feature["geometry"]["coordinates"]
                
                # Add first and last point as nodes
                first_point = tuple(coords[0])
                last_point = tuple(coords[-1])
                
                # Generate node IDs based on coordinates (simplified)
                first_id = f"node_{first_point[0]}_{first_point[1]}".replace(".", "_")
                last_id = f"node_{last_point[0]}_{last_point[1]}".replace(".", "_")
                
                # Add first point if not already present
                if first_id not in nodes:
                    nodes[first_id] = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": list(first_point)
                        },
                        "properties": {
                            "id": first_id,
                            "type": "intersection"
                        }
                    }
                
                # Add last point if not already present
                if last_id not in nodes:
                    nodes[last_id] = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": list(last_point)
                        },
                        "properties": {
                            "id": last_id,
                            "type": "intersection"
                        }
                    }
        
        # Convert dict to list for GeoJSON
        node_features = list(nodes.values())
        
        return {
            "type": "FeatureCollection",
            "features": node_features
        }


# Create singleton instance
osm_service = OSMService()
