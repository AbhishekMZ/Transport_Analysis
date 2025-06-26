import networkx as nx
from typing import Optional, Dict, Any
import pickle
from .osm_service import osm_service
import math

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