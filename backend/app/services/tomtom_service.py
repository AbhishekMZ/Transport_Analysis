"""
TomTom Service for fetching real-time traffic data.
"""

import httpx
import asyncio
from datetime import datetime
import json
import logging
from typing import Dict, Any, Optional

from app.core.config import settings
from app.websockets import manager # <--- IMPORT FROM THE NEW FILE

logger = logging.getLogger(__name__)


class TomTomService:
    """
    Service for interacting with TomTom APIs to fetch real-time traffic data.
    Maintains an in-memory cache of the latest traffic flow and incident data.
    """

    def __init__(self):
        self.api_key = settings.TOMTOM_API_KEY
        # Corrected to use settings object for URLs
        self.flow_base_url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
        self.incidents_base_url = "https://api.tomtom.com/traffic/services/5/incidentDetails/s3/77.4,12.8,77.8,13.2?key="
        self.traffic_flow_cache: Dict[str, Any] = {}
        self.incidents_cache: Dict[str, Any] = {}
        self.default_bbox = settings.BANGALORE_BBOX  # Default is Bangalore area

    async def fetch_traffic_flow(self, bbox: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch real-time traffic flow data for the specified bounding box.
        
        Args:
            bbox: Bounding box in format "minLon,minLat,maxLon,maxLat"
            
        Returns:
            Dictionary containing traffic flow data
        """
        bbox = bbox or self.default_bbox
        
        params = {
            "key": self.api_key,
            "bbox": bbox,
            "style": "relative",  # Speed relative to free flow
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.flow_base_url, params=params)
                response.raise_for_status()
                
                data = response.json()
                
                # Update cache with timestamp
                self.traffic_flow_cache = {
                    "timestamp": datetime.now().isoformat(),
                    "bbox": bbox,
                    "data": data
                }
                
                logger.info(f"Updated traffic flow data for bbox {bbox}")
                return data
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching traffic flow: {e.response.status_code} {e.response.text}")
            # Return cached data if available, otherwise empty response
            return self.traffic_flow_cache.get("data", {"error": "Failed to fetch traffic data"})
            
        except Exception as e:
            logger.error(f"Error fetching traffic flow: {str(e)}")
            return self.traffic_flow_cache.get("data", {"error": "Failed to fetch traffic data"})

    async def fetch_traffic_incidents(self, bbox: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch traffic incidents for the specified bounding box.
        
        Args:
            bbox: Bounding box in format "minLon,minLat,maxLon,maxLat"
            
        Returns:
            Dictionary containing traffic incident data
        """
        bbox = bbox or self.default_bbox
        
        params = {
            "key": self.api_key,
            "bbox": bbox,
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.incidents_base_url, params=params)
                response.raise_for_status()
                
                data = response.json()
                
                # Update cache with timestamp
                self.incidents_cache = {
                    "timestamp": datetime.now().isoformat(),
                    "bbox": bbox,
                    "data": data
                }
                
                logger.info(f"Updated traffic incidents data for bbox {bbox}")
                return data
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching traffic incidents: {e.response.status_code} {e.response.text}")
            return self.incidents_cache.get("data", {"error": "Failed to fetch incident data"})
            
        except Exception as e:
            logger.error(f"Error fetching traffic incidents: {str(e)}")
            return self.incidents_cache.get("data", {"error": "Failed to fetch incident data"})

    async def get_cached_flow(self) -> Dict[str, Any]:
        """Get the cached traffic flow data"""
        return self.traffic_flow_cache

    async def get_cached_incidents(self) -> Dict[str, Any]:
        """Get the cached traffic incidents data"""
        return self.incidents_cache
    
    async def update_all_traffic_data(self) -> Dict[str, Any]:
        """Update both flow and incidents data and notify WebSocket clients."""
        flow_data = await self.fetch_traffic_flow()
        incidents_data = await self.fetch_traffic_incidents()
        # Broadcast to WebSocket clients
        await manager.broadcast(json.dumps({
            "flow": self.traffic_flow_cache,
            "incidents": self.incidents_cache
        }))
        return {
            "flow": self.traffic_flow_cache,
            "incidents": self.incidents_cache
        }
        
    def get_area_bbox(self, area_name: str) -> str:
        """
        Convert named areas to bounding boxes.
        Currently supports common Bangalore areas.
        """
        area_mapping = {
            "central": "77.58,12.95,77.62,13.00",  # Central Bangalore
            "koramangala": "77.61,12.92,77.65,12.96",  # Koramangala
            "whitefield": "77.73,12.95,77.77,12.99",  # Whitefield
            "electronic_city": "77.64,12.83,77.68,12.87",  # Electronic City
            "indiranagar": "77.63,12.97,77.65,13.01",  # Indiranagar
            "marathahalli": "77.69,12.95,77.73,12.97",  # Marathahalli
        }
        
        return area_mapping.get(area_name.lower(), self.default_bbox)


# Create a singleton instance
tomtom_service = TomTomService()
