"""
Traffic data API endpoints.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional

from app.services.tomtom_service import tomtom_service

router = APIRouter()

@router.get("/traffic/realtime/flow")
async def get_realtime_traffic_flow(
    area: Optional[str] = Query(None, description="Named area (e.g., central, koramangala)"),
    refresh: bool = Query(False, description="Force refresh data from TomTom API")
) -> Dict[str, Any]:
    """
    Get real-time traffic flow data for Bangalore or a specific area.
    
    If refresh is true, fetches fresh data from TomTom API.
    Otherwise returns cached data if available.
    """
    if refresh:
        # If refresh is requested, get new data from TomTom API
        if area:
            bbox = tomtom_service.get_area_bbox(area)
            return await tomtom_service.fetch_traffic_flow(bbox)
        else:
            return await tomtom_service.fetch_traffic_flow()
    else:
        # Otherwise check if we have cached data
        cached_data = await tomtom_service.get_cached_flow()
        
        # If no cached data or cache for different area, fetch new data
        if not cached_data or (area and cached_data.get("area") != area):
            if area:
                bbox = tomtom_service.get_area_bbox(area)
                return await tomtom_service.fetch_traffic_flow(bbox)
            else:
                return await tomtom_service.fetch_traffic_flow()
        
        return cached_data


@router.get("/traffic/realtime/incidents")
async def get_realtime_traffic_incidents(
    area: Optional[str] = Query(None, description="Named area (e.g., central, koramangala)"),
    refresh: bool = Query(False, description="Force refresh data from TomTom API")
) -> Dict[str, Any]:
    """
    Get real-time traffic incidents for Bangalore or a specific area.
    
    If refresh is true, fetches fresh data from TomTom API.
    Otherwise returns cached data if available.
    """
    if refresh:
        # If refresh is requested, get new data from TomTom API
        if area:
            bbox = tomtom_service.get_area_bbox(area)
            return await tomtom_service.fetch_traffic_incidents(bbox)
        else:
            return await tomtom_service.fetch_traffic_incidents()
    else:
        # Otherwise check if we have cached data
        cached_data = await tomtom_service.get_cached_incidents()
        
        # If no cached data or cache for different area, fetch new data
        if not cached_data or (area and cached_data.get("area") != area):
            if area:
                bbox = tomtom_service.get_area_bbox(area)
                return await tomtom_service.fetch_traffic_incidents(bbox)
            else:
                return await tomtom_service.fetch_traffic_incidents()
        
        return cached_data


@router.get("/traffic/realtime/summary")
async def get_traffic_summary() -> Dict[str, Any]:
    """
    Get a summary of the current traffic situation in Bangalore.
    Includes high-level metrics derived from flow and incident data.
    """
    # Get latest data
    flow_data = await tomtom_service.get_cached_flow()
    incidents_data = await tomtom_service.get_cached_incidents()
    
    # If either is empty, fetch them
    if not flow_data:
        flow_data = await tomtom_service.fetch_traffic_flow()
    
    if not incidents_data:
        incidents_data = await tomtom_service.fetch_traffic_incidents()
    
    # Extract incident count (simplified example)
    incident_count = 0
    incidents_by_type = {}
    
    if incidents_data and "incidents" in incidents_data.get("data", {}):
        incidents = incidents_data["data"]["incidents"]
        incident_count = len(incidents)
        
        # Count incidents by type
        for incident in incidents:
            incident_type = incident.get("type", "unknown")
            incidents_by_type[incident_type] = incidents_by_type.get(incident_type, 0) + 1
    
    # Calculate congestion level (simplified example)
    congestion_level = "Low"  # Default
    congestion_score = 0
    
    if flow_data and "flowSegmentData" in flow_data.get("data", {}):
        segments = flow_data["data"]["flowSegmentData"]
        
        # Calculate average congestion
        if segments:
            congestion_sum = sum(segment.get("currentSpeed", 0) / max(segment.get("freeFlowSpeed", 1), 1) for segment in segments)
            congestion_score = 1 - (congestion_sum / len(segments))
            
            # Determine congestion level
            if congestion_score > 0.5:
                congestion_level = "High"
            elif congestion_score > 0.25:
                congestion_level = "Medium"
    
    return {
        "timestamp": flow_data.get("timestamp", ""),
        "congestion_level": congestion_level,
        "congestion_score": round(congestion_score, 2),
        "incident_count": incident_count,
        "incidents_by_type": incidents_by_type,
        "data_freshness_minutes": 0,  # Calculate from timestamp
        "status": "Active"
    }


@router.get("/traffic/areas")
async def get_traffic_areas() -> Dict[str, Any]:
    """
    Get a list of predefined areas for traffic monitoring.
    Each area includes name and bounding box.
    """
    return {
        "areas": [
            {"name": "central", "label": "Central Bangalore", "bbox": "77.58,12.95,77.62,13.00"},
            {"name": "koramangala", "label": "Koramangala", "bbox": "77.61,12.92,77.65,12.96"},
            {"name": "whitefield", "label": "Whitefield", "bbox": "77.73,12.95,77.77,12.99"},
            {"name": "electronic_city", "label": "Electronic City", "bbox": "77.64,12.83,77.68,12.87"},
            {"name": "indiranagar", "label": "Indiranagar", "bbox": "77.63,12.97,77.65,13.01"},
            {"name": "marathahalli", "label": "Marathahalli", "bbox": "77.69,12.95,77.73,12.97"},
        ]
    }
