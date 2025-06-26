# main.py

import os
import asyncio
import time  # Using the standard time library
from fastapi import FastAPI, APIRouter, HTTPException, Body, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

# --------------------------------------------------------------------------
# Application Initialization
# --------------------------------------------------------------------------

app = FastAPI(
    title="TransiGenius API",
    description="AI-powered transport analysis for Bangalore's public and road transport networks.",
    version="1.0.0"
)

# --------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing) Middleware
# --------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# API Routers
# --------------------------------------------------------------------------

tools_router = APIRouter(prefix="/api/tools", tags=["TransiGenius Tools"])
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Integration"])
traffic_router = APIRouter(prefix="/api/v1/traffic", tags=["Real-time Traffic (v1)"])


# --------------------------------------------------------------------------
# Pydantic Models
# --------------------------------------------------------------------------

class CriticalityRequest(BaseModel):
    analysis_year: int = Field(..., example=2024)
    algorithm_type: Literal["betweenness_centrality", "closeness_centrality", "degree_centrality"]
    top_n: int = Field(10, gt=0)

class TrafficRequest(BaseModel):
    data_type: Literal["all", "flow", "incidents"]
    area_of_interest: str = Field(..., example="MG Road")

class ForecastRequest(BaseModel):
    prediction_horizon: int = Field(..., example=24)
    area: str = Field("city-wide")

class DisruptionRequest(BaseModel):
    disruption_scenario: str = Field(..., example="Major road closure on Outer Ring Road")

class VisualizationRequest(BaseModel):
    action: Literal["display_layer", "highlight_nodes", "show_heatmap"]
    payload: Dict[str, Any]

class StaticMapRequest(BaseModel):
    report_name: str = Field(..., example="Q1_Traffic_Report")
    map_features: List[str] = Field(..., example=["road_network_2024", "critical_nodes"])


# --------------------------------------------------------------------------
# API Endpoints
# --------------------------------------------------------------------------

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the TransiGenius API!"}

@app.get("/api/health", tags=["Health Check"])
async def health_check():
    return {"status": "ok"}

# --- Real-time Traffic Endpoints ---

@traffic_router.get("/realtime/incidents")
async def get_realtime_incidents():
    return {
        "incidents": [
            {"id": 1, "description": "Accident reported on MG Road", "location": [12.9716, 77.5946]},
            {"id": 2, "description": "Heavy traffic congestion near Silk Board Junction", "location": [12.9177, 77.6238]}
        ]
    }

@traffic_router.get("/realtime/flow")
async def get_realtime_flow():
    return {
        "flow_data": [
            {"road": "MG Road", "speed": 15, "congestion": "high"},
            {"road": "Koramangala 80ft Main Road", "speed": 25, "congestion": "moderate"},
            {"road": "Outer Ring Road", "speed": 20, "congestion": "high"}
        ]
    }

# --- WebSocket Endpoint (Corrected) ---

@app.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for streaming real-time traffic updates.
    """
    await websocket.accept()
    try:
        while True:
            # Simulate a 5-second update interval
            await asyncio.sleep(5)
            
            # **Correction:** Define data directly inside the loop to avoid the async call issue.
            # This is a more stable pattern for this scenario.
            flow_data = {
                "flow_data": [
                    {"road": "MG Road", "speed": 15, "congestion": "high"},
                    {"road": "Koramangala 80ft Main Road", "speed": 25, "congestion": "moderate"},
                    {"road": "Outer Ring Road", "speed": 20, "congestion": "high"}
                ]
            }

            await websocket.send_json({
                "timestamp": time.time(),
                "type": "flow_update",
                "data": flow_data
            })
    except WebSocketDisconnect:
        print("Client disconnected from traffic WebSocket.")
    except Exception as e:
        print(f"Error in traffic WebSocket: {e}")
        # Ensure the connection is closed on error
        await websocket.close(code=1011)


# --- TransiGenius Tool Endpoints (Original) ---

@tools_router.post("/project-metadata")
async def get_project_metadata():
    return {
        "project_name": "TransiGenius",
        "data_timeline": "2014-2025",
        "datasets": ["Temporal GeoJSON", "BMTC GTFS", "OpenStreetMap"],
    }

@tools_router.post("/gtfs-routes")
async def get_gtfs_routes(filters: Optional[Dict[str, Any]] = Body(None)):
    return {"message": "GTFS routes data will be returned here.", "applied_filters": filters or {}}

@tools_router.post("/temporal-geojson")
async def get_temporal_geojson(year: int = Body(..., embed=True), layer: str = Body(..., embed=True)):
    return {"message": f"GeoJSON data for year {year} and layer '{layer}' will be returned."}

@tools_router.post("/network-criticality")
async def analyze_network_criticality(request: CriticalityRequest):
    return {"message": "Network criticality analysis results.", "parameters": request.dict()}

@tools_router.post("/realtime-traffic")
async def get_realtime_traffic(request: TrafficRequest):
    return {"message": "Real-time traffic data will be fetched and returned.", "parameters": request.dict()}

@tools_router.post("/ml-forecast")
async def get_ml_forecast(request: ForecastRequest):
    return {"message": "ML forecast results will be generated here.", "parameters": request.dict()}

@tools_router.post("/simulate-disruption")
async def simulate_disruption(request: DisruptionRequest):
    return {"message": "Disruption simulation results.", "parameters": request.dict()}


# --- Dashboard Integration Endpoints ---

@dashboard_router.post("/update-visualization")
async def update_dashboard_visualization(request: VisualizationRequest):
    return {"message": "Dashboard visualization updated.", "action": request.action, "status": "success"}

@dashboard_router.post("/generate-static-map")
async def generate_static_map_report(request: StaticMapRequest):
    map_url = "https://maps.googleapis.com/maps/api/staticmap?center=Bengaluru&size=600x400&key=YOUR_API_KEY"
    return {"message": "Static map generated for report.", "report_name": request.report_name, "static_map_url": map_url}

# --------------------------------------------------------------------------
# Registering Routers
# --------------------------------------------------------------------------

app.include_router(tools_router)
app.include_router(dashboard_router)
app.include_router(traffic_router)

# --------------------------------------------------------------------------
# Main Entry Point
# --------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
