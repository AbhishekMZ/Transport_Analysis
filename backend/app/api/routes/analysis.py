"""
Network analysis API endpoints for the transport network.
"""

from fastapi import APIRouter, HTTPException, Query, Path, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.analysis_service import analysis_service
from app.database import get_db
from app.services.graph_service import graph_service
from app.db.models import RoadSegment
import networkx as nx
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/analysis/critical-nodes")
async def get_critical_nodes(
    year: int = Query(2025, description="Year to analyze"),
    algorithm: str = Query("betweenness", description="Centrality algorithm to use"),
    top_n: int = Query(20, description="Number of critical nodes to return"),
    transport_modes: List[str] = Query(["road", "bus", "metro"], description="Transport modes to include")
) -> Dict[str, Any]:
    """
    Identify critical nodes in the transport network using various centrality algorithms.
    """
    # Validate algorithm
    valid_algorithms = ["betweenness", "closeness", "degree", "eigenvector", "pagerank"]
    if algorithm not in valid_algorithms:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid algorithm. Valid options: {', '.join(valid_algorithms)}"
        )
    
    # Validate transport modes
    valid_modes = ["road", "bus", "metro", "walking"]
    for mode in transport_modes:
        if mode not in valid_modes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transport mode: {mode}. Valid options: {', '.join(valid_modes)}"
            )
    
    try:
        # Use real analysis service
        critical_nodes = await analysis_service.get_critical_nodes(
            year=year,
            algorithm=algorithm,
            top_n=top_n,
            transport_modes=transport_modes
        )
        
        # Convert to API response format
        nodes_data = []
        for node in critical_nodes:
            nodes_data.append({
                "id": node.id,
                "coordinates": node.coordinates,
                "centrality_score": node.centrality_score,
                "node_type": node.node_type,
                "transport_modes": node.transport_modes,
                "description": node.description
            })
        
        return {
            "critical_nodes": nodes_data,
            "algorithm": algorithm,
            "year": year,
            "transport_modes": transport_modes,
            "total_found": len(nodes_data),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze critical nodes: {str(e)}"
        )

@router.post("/analysis/simulate-disruption")
async def simulate_disruption(
    year: int = Query(2025, description="Year to simulate"),
    disruption_type: str = Query("node_failure", description="Type of disruption to simulate"),
    disruption_nodes: List[str] = Query(None, description="Specific nodes to disrupt"),
    disruption_area: Optional[str] = Query(None, description="Area to disrupt (e.g., central, koramangala)"),
    transport_modes: List[str] = Query(["road", "bus", "metro"], description="Transport modes to include")
) -> Dict[str, Any]:
    """
    Simulate the effects of disruptions on the transport network.
    """
    # Validate disruption type
    valid_types = ["node_failure", "edge_failure", "area_disruption", "natural_disaster"]
    if disruption_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid disruption type. Valid options: {', '.join(valid_types)}"
        )
    
    # Validate that either nodes or area is specified
    if not disruption_nodes and not disruption_area:
        raise HTTPException(
            status_code=400,
            detail="Either disruption_nodes or disruption_area must be specified"
        )
    
    try:
        # Use real analysis service
        impact = await analysis_service.simulate_disruption(
            year=year,
            disruption_type=disruption_type,
            disruption_nodes=disruption_nodes,
            disruption_area=disruption_area,
            transport_modes=transport_modes
        )
        
        return {
            "disruption_simulation": {
                "year": year,
                "disruption_type": disruption_type,
                "disruption_nodes": disruption_nodes,
                "disruption_area": disruption_area,
                "transport_modes": transport_modes,
                "impact": {
                    "affected_nodes": impact.affected_nodes,
                    "affected_edges": impact.affected_edges,
                    "connectivity_change": impact.connectivity_change,
                    "estimated_delay_minutes": impact.estimated_delay,
                    "detour_routes": impact.detour_routes
                },
                "simulation_timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to simulate disruption: {str(e)}"
        )

@router.get("/analysis/traffic-forecast")
async def get_traffic_forecast(
    target_date: str = Query(..., description="Target date for forecast (YYYY-MM-DD)"),
    time_of_day: str = Query(..., description="Time of day (HH:MM)"),
    area: Optional[str] = Query(None, description="Area to forecast (e.g., central, koramangala)")
) -> Dict[str, Any]:
    """
    Get ML-based traffic flow and congestion forecasts for a future date and time.
    """
    # Validate date format
    try:
        datetime.strptime(target_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Validate time format
    try:
        datetime.strptime(time_of_day, "%H:%M")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid time format. Use HH:MM"
        )
    
    try:
        # Use real analysis service
        forecast = await analysis_service.get_traffic_forecast(
            target_date=target_date,
            time_of_day=time_of_day,
            area=area
        )
        
        return {
            "traffic_forecast": forecast
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate traffic forecast: {str(e)}"
        )

@router.get("/critical-nodes/{year}")
async def get_critical_nodes(
    year: int,
    db: Session = Depends(get_db),
    limit: int = Query(10, description="Number of critical nodes to return"),
    algorithm: str = Query("betweenness", description="Algorithm type: betweenness, closeness, or degree")
) -> Dict[str, Any]:
    """
    Get critical nodes in the transport network using graph analysis.
    
    Args:
        year: Year of the network data
        limit: Maximum number of nodes to return
        algorithm: Type of centrality analysis to use
    
    Returns:
        Critical nodes with centrality scores and coordinates
    """
    try:
        logger.info(f"Calculating critical nodes for year {year} using {algorithm} centrality")
        
        # Get road network from database for graph construction
        road_segments = db.query(RoadSegment).filter(RoadSegment.year == year).all()
        
        if not road_segments:
            logger.warning(f"No road network data found for year {year}")
            return {
                "year": year,
                "algorithm": algorithm,
                "nodes": [],
                "count": 0,
                "message": f"No road network data available for year {year}"
            }
        
        # Build graph from road segments
        graph = graph_service.build_graph_from_segments(road_segments)
        
        if graph is None or graph.number_of_nodes() == 0:
            logger.warning(f"Failed to build graph from road segments for year {year}")
            return {
                "year": year,
                "algorithm": algorithm,
                "nodes": [],
                "count": 0,
                "message": "Failed to build graph from road network data"
            }
        
        # Calculate centrality measures
        critical_nodes = []
        
        if algorithm == "betweenness":
            centrality_scores = nx.betweenness_centrality(graph)
        elif algorithm == "closeness":
            centrality_scores = nx.closeness_centrality(graph)
        elif algorithm == "degree":
            centrality_scores = nx.degree_centrality(graph)
        else:
            # Default to betweenness if unknown algorithm
            centrality_scores = nx.betweenness_centrality(graph)
            algorithm = "betweenness"
        
        # Sort nodes by centrality score
        sorted_nodes = sorted(
            centrality_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        # Extract node information
        for node_id, centrality_score in sorted_nodes:
            node_data = graph.nodes.get(node_id, {})
            
            critical_nodes.append({
                "id": str(node_id),
                "centrality_score": round(centrality_score, 6),
                "lat": node_data.get('y', 0),
                "lon": node_data.get('x', 0),
                "degree": graph.degree(node_id),
                "betweenness": round(nx.betweenness_centrality(graph, k=min(100, graph.number_of_nodes())).get(node_id, 0), 6),
                "closeness": round(nx.closeness_centrality(graph).get(node_id, 0), 6) if graph.number_of_nodes() < 1000 else 0
            })
        
        return {
            "year": year,
            "algorithm": algorithm,
            "nodes": critical_nodes,
            "count": len(critical_nodes),
            "total_nodes": graph.number_of_nodes(),
            "total_edges": graph.number_of_edges()
        }
    
    except Exception as e:
        logger.error(f"Error calculating critical nodes: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate critical nodes: {str(e)}"
        )
