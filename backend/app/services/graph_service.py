import networkx as nx
from typing import Dict, List, Tuple, Optional, Any
import pickle
from .osm_service import osm_service
import math
from app.db.models import RoadSegment
from geoalchemy2.functions import ST_AsText
from geoalchemy2.elements import WKTElement
from shapely.geometry import LineString, Point
from shapely.wkt import loads as wkt_loads
import json
import logging

logger = logging.getLogger(__name__)

class TransportGraphService:
    def __init__(self):
        self.graph = nx.MultiDiGraph()

    def build_road_network_from_osm(self, osm_data: Dict[str, Any]):
        """
        Build the road network layer from OSM data (GeoJSON FeatureCollection).
        Each LineString feature becomes an edge; start/end coordinates become nodes.
        Node coordinates are stored as node attributes; edge properties as edge attributes.
        """
        for feature in osm_data.get("features", []):
            if feature["geometry"]["type"] == "LineString":
                coords = feature["geometry"]["coordinates"]
                properties = feature.get("properties", {})
                # Add nodes for start and end points
                start = tuple(coords[0])
                end = tuple(coords[-1])
                self.graph.add_node(start, coord=start, type="road_node")
                self.graph.add_node(end, coord=end, type="road_node")
                # Add edge for the road segment
                self.graph.add_edge(start, end, **properties, geometry=coords, layer="road")

    def build_public_transport_layers_from_gtfs(self, gtfs_data: Dict[str, Any]):
        """
        Build bus and metro layers from GTFS data (GeoJSON FeatureCollections for stops and routes).
        Each stop (Point) becomes a node; each route (LineString) becomes an edge.
        """
        stops = gtfs_data.get("stops", {}).get("features", [])
        routes = gtfs_data.get("routes", {}).get("features", [])

        # Add stops as nodes
        for feature in stops:
            if feature["geometry"]["type"] == "Point":
                coord = tuple(feature["geometry"]["coordinates"])
                properties = feature.get("properties", {})
                layer = properties.get("type", "bus")
                self.graph.add_node(coord, **properties, coord=coord, type="pt_stop", layer=layer)

        # Add routes as edges
        for feature in routes:
            if feature["geometry"]["type"] == "LineString":
                coords = feature["geometry"]["coordinates"]
                properties = feature.get("properties", {})
                layer = properties.get("type", "bus")
                # Add edge from first to last stop (simplified)
                start = tuple(coords[0])
                end = tuple(coords[-1])
                self.graph.add_edge(start, end, **properties, geometry=coords, layer=layer)

    def connect_transfer_points(self, max_distance_m: float = 50.0):
        """
        Connect nodes from different layers (e.g., road, bus, metro) that are spatially close (within max_distance_m meters).
        Adds a transfer edge with type 'transfer' and layer 'transfer'.
        """
        nodes = list(self.graph.nodes(data=True))
        for i, (coord1, attr1) in enumerate(nodes):
            for j in range(i+1, len(nodes)):
                coord2, attr2 = nodes[j]
                # Only connect nodes from different layers
                if attr1.get("layer") != attr2.get("layer") and attr1.get("layer") and attr2.get("layer"):
                    dist = self._haversine_distance(coord1, coord2)
                    if dist <= max_distance_m:
                        self.graph.add_edge(coord1, coord2, type="transfer", layer="transfer", weight=1, distance=dist)

    def _haversine_distance(self, coord1, coord2):
        """
        Calculate the Haversine distance (in meters) between two (lon, lat) coordinates.
        """
        lon1, lat1 = coord1
        lon2, lat2 = coord2
        R = 6371000  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def update_edge_weights(self, traffic_data: Optional[Dict[str, Any]] = None):
        """
        Update edge weights based on real-time traffic data.
        For each road edge, if traffic_data provides a speed or delay for the edge (by id or coordinates), update the edge's weight accordingly.
        """
        if not traffic_data:
            return
        for u, v, k, data in self.graph.edges(keys=True, data=True):
            if data.get('layer') == 'road':
                # Try to match by id if available
                edge_id = data.get('id')
                traffic_info = None
                if edge_id and isinstance(edge_id, str):
                    traffic_info = traffic_data.get(edge_id)
                # Optionally, try to match by coordinates if traffic_data uses tuple keys
                if not traffic_info:
                    edge_key = (u, v)
                    if edge_key in traffic_data:
                        traffic_info = traffic_data[edge_key]
                if traffic_info:
                    speed = traffic_info.get('speed')
                    delay = traffic_info.get('delay')
                    if speed and speed > 0:
                        data['weight'] = 1.0 / speed
                    elif delay:
                        data['weight'] = delay
                    else:
                        data['weight'] = 1.0

    def serialize_graph(self, path: str):
        """
        Serialize the graph to disk for fast loading using pickle.
        """
        with open(path, "wb") as f:
            pickle.dump(self.graph, f)

    def load_graph(self, path: str):
        """
        Load a serialized graph from disk using pickle.
        """
        with open(path, "rb") as f:
            self.graph = pickle.load(f)

# Global instance for transport graph service  
transport_graph_service = TransportGraphService()

class GraphService:
    """
    Service for handling NetworkX graph operations from database road segments.
    """
    def __init__(self):
        self.graph = None
        self.node_positions = {}
    
    def build_graph_from_segments(self, road_segments: List[RoadSegment]) -> Optional[nx.MultiDiGraph]:
        """
        Build a NetworkX graph from database road segments.
        
        Args:
            road_segments: List of RoadSegment ORM objects
            
        Returns:
            NetworkX MultiDiGraph or None if failed
        """
        try:
            logger.info(f"Building graph from {len(road_segments)} road segments")
            
            # Create directed multigraph
            graph = nx.MultiDiGraph()
            
            for segment in road_segments:
                try:
                    # Extract geometry from WKT
                    if segment.geometry:
                        # Convert WKTElement to WKT string and parse
                        wkt_str = str(segment.geometry)
                        if wkt_str.startswith('SRID='):
                            # Remove SRID prefix if present
                            wkt_str = wkt_str.split(';', 1)[1]
                        
                        line_geom = wkt_loads(wkt_str)
                        
                        if isinstance(line_geom, LineString):
                            coords = list(line_geom.coords)
                            
                            # Add nodes for start and end points
                            start_node = f"node_{coords[0][1]:.6f}_{coords[0][0]:.6f}"
                            end_node = f"node_{coords[-1][1]:.6f}_{coords[-1][0]:.6f}"
                            
                            # Add nodes with coordinates
                            graph.add_node(start_node, 
                                         x=coords[0][0], 
                                         y=coords[0][1], 
                                         lat=coords[0][1], 
                                         lon=coords[0][0])
                            
                            graph.add_node(end_node, 
                                         x=coords[-1][0], 
                                         y=coords[-1][1], 
                                         lat=coords[-1][1], 
                                         lon=coords[-1][0])
                            
                            # Calculate edge length
                            length = line_geom.length
                            
                            # Add edge with properties
                            graph.add_edge(
                                start_node, 
                                end_node,
                                key=segment.id,
                                length=length,
                                geometry=coords,
                                osm_id=segment.osm_id,
                                road_type=segment.road_type,
                                name=segment.name,
                                lanes=segment.lanes or 1,
                                segment_id=segment.id
                            )
                            
                            # Add reverse edge if it's a two-way road
                            if segment.road_type not in ['motorway', 'trunk', 'primary_link']:
                                graph.add_edge(
                                    end_node, 
                                    start_node,
                                    key=f"{segment.id}_reverse",
                                    length=length,
                                    geometry=list(reversed(coords)),
                                    osm_id=segment.osm_id,
                                    road_type=segment.road_type,
                                    name=segment.name,
                                    lanes=segment.lanes or 1,
                                    segment_id=segment.id
                                )
                        
                except Exception as e:
                    logger.warning(f"Failed to process segment {segment.id}: {str(e)}")
                    continue
            
            logger.info(f"Built graph with {graph.number_of_nodes()} nodes and {graph.number_of_edges()} edges")
            self.graph = graph
            return graph
            
        except Exception as e:
            logger.error(f"Error building graph from segments: {str(e)}")
            return None
    
    def get_shortest_path(self, start_node: str, end_node: str, weight: str = "length") -> Optional[List[str]]:
        """
        Calculate shortest path between two nodes.
        
        Args:
            start_node: Starting node ID
            end_node: Ending node ID
            weight: Edge attribute to use as weight
            
        Returns:
            List of node IDs forming the shortest path
        """
        try:
            if self.graph is None:
                logger.error("Graph not initialized")
                return None
                
            if start_node not in self.graph or end_node not in self.graph:
                logger.error(f"Node not found in graph: {start_node} or {end_node}")
                return None
                
            path = nx.shortest_path(self.graph, start_node, end_node, weight=weight)
            return path
            
        except nx.NetworkXNoPath:
            logger.warning(f"No path found between {start_node} and {end_node}")
            return None
        except Exception as e:
            logger.error(f"Error calculating shortest path: {str(e)}")
            return None
    
    def calculate_centrality_measures(self, centrality_type: str = "betweenness") -> Dict[str, float]:
        """
        Calculate centrality measures for all nodes in the graph.
        
        Args:
            centrality_type: Type of centrality ('betweenness', 'closeness', 'degree')
            
        Returns:
            Dictionary mapping node IDs to centrality scores
        """
        try:
            if self.graph is None:
                logger.error("Graph not initialized")
                return {}
            
            if centrality_type == "betweenness":
                return nx.betweenness_centrality(self.graph, weight="length")
            elif centrality_type == "closeness":
                return nx.closeness_centrality(self.graph, distance="length")
            elif centrality_type == "degree":
                return nx.degree_centrality(self.graph)
            else:
                logger.warning(f"Unknown centrality type: {centrality_type}")
                return nx.betweenness_centrality(self.graph, weight="length")
                
        except Exception as e:
            logger.error(f"Error calculating centrality measures: {str(e)}")
            return {}

# Global instance for graph analysis
graph_service = GraphService()