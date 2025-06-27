"""
TomTom Service for fetching real-time traffic data.
"""

import httpx
import asyncio
from datetime import datetime, timedelta
import json
import logging
from typing import Dict, Any, Optional, List
import time

from app.core.config import settings

logger = logging.getLogger(__name__)


class TomTomService:
    """
    Service for interacting with TomTom APIs to fetch real-time traffic data.
    Maintains an in-memory cache of the latest traffic flow and incident data.
    """

    def __init__(self):
        self.api_key = settings.TOMTOM_API_KEY
        self.flow_base_url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
        self.incidents_base_url = "https://api.tomtom.com/traffic/services/5/incidentDetails"
        self.traffic_flow_cache: Dict[str, Any] = {}
        self.incidents_cache: Dict[str, Any] = {}
        self.cache_expiry_minutes = 5  # Cache for 5 minutes
        self.last_flow_fetch = None
        self.last_incidents_fetch = None
        
        # Bangalore bounding box
        self.default_bbox = "77.4,12.8,77.8,13.2"

    async def fetch_traffic_flow(self, bbox: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch real-time traffic flow data for the specified bounding box.
        
        Args:
            bbox: Bounding box in format "minLon,minLat,maxLon,maxLat"
            
        Returns:
            Dictionary containing traffic flow data
        """
        bbox = bbox or self.default_bbox
        
        # Check cache first
        if self._is_cache_valid(self.last_flow_fetch):
            logger.info("Returning cached traffic flow data")
            return self.traffic_flow_cache
        
        if not self.api_key:
            logger.warning("TomTom API key not configured. Returning mock data.")
            return self._get_mock_traffic_flow()
        
        try:
            # TomTom Traffic Flow API endpoint
            url = f"{self.flow_base_url}"
            params = {
                "key": self.api_key,
                "bbox": bbox,
                "style": "relative",  # Speed relative to free flow
                "thickness": 10,
                "openLr": "false"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                
                # Process and format the data
                processed_data = self._process_traffic_flow_data(data)
                
                # Cache the result
                self.traffic_flow_cache = processed_data
                self.last_flow_fetch = datetime.now()
                
                logger.info(f"Successfully fetched traffic flow data with {len(processed_data.get('flowSegments', []))} segments")
                return processed_data
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching traffic flow: {e.response.status_code} - {e.response.text}")
            return self._get_mock_traffic_flow()
        except Exception as e:
            logger.error(f"Error fetching traffic flow data: {str(e)}")
            return self._get_mock_traffic_flow()

    async def fetch_traffic_incidents(self, bbox: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch real-time traffic incidents for the specified bounding box.
        
        Args:
            bbox: Bounding box in format "minLon,minLat,maxLon,maxLat"
            
        Returns:
            Dictionary containing traffic incidents data
        """
        bbox = bbox or self.default_bbox
        
        # Check cache first
        if self._is_cache_valid(self.last_incidents_fetch):
            logger.info("Returning cached traffic incidents data")
            return self.incidents_cache
        
        if not self.api_key:
            logger.warning("TomTom API key not configured. Returning mock data.")
            return self._get_mock_traffic_incidents()
        
        try:
            # TomTom Traffic Incidents API endpoint
            url = f"{self.incidents_base_url}/s3/{bbox}/json"
            params = {
                "key": self.api_key,
                "language": "en-US",
                "timeValidityFilter": "present"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                
                # Process and format the data
                processed_data = self._process_traffic_incidents_data(data)
                
                # Cache the result
                self.incidents_cache = processed_data
                self.last_incidents_fetch = datetime.now()
                
                logger.info(f"Successfully fetched traffic incidents data with {len(processed_data.get('incidents', []))} incidents")
                return processed_data
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching traffic incidents: {e.response.status_code} - {e.response.text}")
            return self._get_mock_traffic_incidents()
        except Exception as e:
            logger.error(f"Error fetching traffic incidents data: {str(e)}")
            return self._get_mock_traffic_incidents()

    def _process_traffic_flow_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw TomTom traffic flow data into our format."""
        processed_segments = []
        
        flow_segments = data.get('flowSegmentData', {})
        if isinstance(flow_segments, dict):
            # Single segment
            flow_segments = [flow_segments]
        elif isinstance(flow_segments, list):
            # Multiple segments
            pass
        else:
            flow_segments = []
        
        for segment in flow_segments:
            try:
                coordinates = segment.get('coordinates', {})
                current_speed = segment.get('currentSpeed', 0)
                free_flow_speed = segment.get('freeFlowSpeed', current_speed)
                
                # Calculate congestion level
                if free_flow_speed > 0:
                    congestion_ratio = current_speed / free_flow_speed
                    if congestion_ratio > 0.8:
                        congestion_level = "low"
                    elif congestion_ratio > 0.5:
                        congestion_level = "medium"
                    else:
                        congestion_level = "high"
                else:
                    congestion_level = "unknown"
                
                processed_segment = {
                    "id": segment.get('frc', ''),
                    "coordinates": coordinates,
                    "currentSpeed": current_speed,
                    "freeFlowSpeed": free_flow_speed,
                    "congestionLevel": congestion_level,
                    "roadClosure": segment.get('roadClosure', False),
                    "confidence": segment.get('confidence', 0)
                }
                processed_segments.append(processed_segment)
                
            except Exception as e:
                logger.warning(f"Error processing traffic flow segment: {e}")
                continue
        
        return {
            "flowSegments": processed_segments,
            "timestamp": datetime.now().isoformat(),
            "bbox": self.default_bbox
        }

    def _process_traffic_incidents_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw TomTom traffic incidents data into our format."""
        processed_incidents = []
        
        incidents = data.get('incidents', [])
        
        for incident in incidents:
            try:
                properties = incident.get('properties', {})
                geometry = incident.get('geometry', {})
                
                processed_incident = {
                    "id": properties.get('id', ''),
                    "iconCategory": properties.get('iconCategory', 0),
                    "magnitudeOfDelay": properties.get('magnitudeOfDelay', 0),
                    "events": properties.get('events', []),
                    "startTime": properties.get('startTime', ''),
                    "endTime": properties.get('endTime', ''),
                    "roadNumbers": properties.get('roadNumbers', []),
                    "timeValidity": properties.get('timeValidity', ''),
                    "probabilityOfOccurrence": properties.get('probabilityOfOccurrence', ''),
                    "numberOfReports": properties.get('numberOfReports', 0),
                    "lastReportTime": properties.get('lastReportTime', ''),
                    "description": properties.get('description', ''),
                    "geometry": geometry,
                    "severity": self._get_incident_severity(properties)
                }
                processed_incidents.append(processed_incident)
                
            except Exception as e:
                logger.warning(f"Error processing traffic incident: {e}")
                continue
        
        return {
            "incidents": processed_incidents,
            "timestamp": datetime.now().isoformat(),
            "bbox": self.default_bbox
        }

    def _get_incident_severity(self, properties: Dict[str, Any]) -> str:
        """Determine incident severity based on magnitude of delay."""
        magnitude = properties.get('magnitudeOfDelay', 0)
        if magnitude >= 3:
            return "high"
        elif magnitude >= 2:
            return "medium"
        else:
            return "low"

    def _is_cache_valid(self, last_fetch: Optional[datetime]) -> bool:
        """Check if cached data is still valid."""
        if not last_fetch:
            return False
        
        expiry_time = last_fetch + timedelta(minutes=self.cache_expiry_minutes)
        return datetime.now() < expiry_time

    def _get_mock_traffic_flow(self) -> Dict[str, Any]:
        """Generate mock traffic flow data when API is not available."""
        mock_segments = []
        
        # Generate some mock traffic segments for Bangalore
        base_coords = [
            {"coordinate": [77.5946, 12.9716]},  # Bangalore center
            {"coordinate": [77.6100, 12.9800]},  # East
            {"coordinate": [77.5800, 12.9600]},  # West
            {"coordinate": [77.5900, 12.9900]},  # North
            {"coordinate": [77.5900, 12.9500]}   # South
        ]
        
        for i, coord in enumerate(base_coords):
            mock_segments.append({
                "id": f"mock_segment_{i}",
                "coordinates": coord,
                "currentSpeed": 25 + (i * 5),
                "freeFlowSpeed": 50,
                "congestionLevel": "medium",
                "roadClosure": False,
                "confidence": 0.8
            })
        
        return {
            "flowSegments": mock_segments,
            "timestamp": datetime.now().isoformat(),
            "bbox": self.default_bbox
        }

    def _get_mock_traffic_incidents(self) -> Dict[str, Any]:
        """Generate mock traffic incidents data when API is not available."""
        mock_incidents = [
            {
                "id": "mock_incident_1",
                "iconCategory": 6,
                "magnitudeOfDelay": 2,
                "events": [{"description": "Road construction", "code": 406}],
                "startTime": datetime.now().isoformat(),
                "endTime": (datetime.now() + timedelta(hours=2)).isoformat(),
                "roadNumbers": ["SH-4"],
                "description": "Road construction causing delays",
                "geometry": {
                    "type": "Point",
                    "coordinates": [77.5946, 12.9716]
                },
                "severity": "medium"
            },
            {
                "id": "mock_incident_2", 
                "iconCategory": 1,
                "magnitudeOfDelay": 3,
                "events": [{"description": "Accident", "code": 101}],
                "startTime": (datetime.now() - timedelta(minutes=30)).isoformat(),
                "endTime": (datetime.now() + timedelta(hours=1)).isoformat(),
                "roadNumbers": ["NH-44"],
                "description": "Traffic accident blocking one lane",
                "geometry": {
                    "type": "Point", 
                    "coordinates": [77.6100, 12.9800]
                },
                "severity": "high"
            }
        ]
        
        return {
            "incidents": mock_incidents,
            "timestamp": datetime.now().isoformat(),
            "bbox": self.default_bbox
        }

    async def get_cached_traffic_data(self) -> Dict[str, Any]:
        """Get all cached traffic data for WebSocket broadcasting."""
        flow_data = self.traffic_flow_cache if self._is_cache_valid(self.last_flow_fetch) else {}
        incidents_data = self.incidents_cache if self._is_cache_valid(self.last_incidents_fetch) else {}
        
        return {
            "traffic_flow": flow_data,
            "incidents": incidents_data,
            "timestamp": datetime.now().isoformat()
        }

    async def refresh_all_data(self) -> Dict[str, Any]:
        """Refresh all traffic data and return combined result."""
        flow_data = await self.fetch_traffic_flow()
        incidents_data = await self.fetch_traffic_incidents()
        
        return {
            "traffic_flow": flow_data,
            "incidents": incidents_data,
            "timestamp": datetime.now().isoformat()
        }
