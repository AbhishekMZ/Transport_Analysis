"""
OpenStreetMap (OSM) data processing service.
"""

import os
import logging
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import random
from sqlalchemy.orm import Session
from geoalchemy2 import WKTElement

from app.core.config import settings
from app.db.models import RoadSegment
from app.db import get_db

# OSM data processing imports
try:
    import osmnx as ox
    import networkx as nx
    import geopandas as gpd
    from shapely.geometry import Point, LineString
    import pandas as pd
    OSM_LIBS_AVAILABLE = True
except ImportError:
    OSM_LIBS_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("OSM libraries not available. Install osmnx, networkx, geopandas for full functionality.")

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

    def load_osm_data(self, year: int = 2024, network_type: str = "drive") -> Dict[str, Any]:
        """
        Load and process OSM road network data, inserting into database.
        
        Args:
            year: Year for the road network (used for versioning)
            network_type: Type of network ('drive', 'walk', 'bike', 'all_private')
            
        Returns:
            Dictionary containing processing statistics
        """
        if not OSM_LIBS_AVAILABLE:
            logger.warning("OSM libraries not available. Generating sample data instead.")
            return self._generate_and_insert_sample_data(year)
        
        # Get database session
        db_gen = get_db()
        db: Session = next(db_gen)
        
        try:
            logger.info(f"Downloading OSM road network for Bangalore (year: {year}, type: {network_type})")
            
            # Define Bangalore boundaries - using a more specific area for better performance
            # You can also use coordinates: north, south, east, west = 13.2, 12.8, 77.8, 77.4
            place_name = "Bengaluru, Karnataka, India"
            
            # Configure OSMnx settings for better performance
            ox.settings.use_cache = True
            ox.settings.log_console = True
            
            # Download road network from OSM with retry logic
            max_retries = 3
            G = None
            
            for attempt in range(max_retries):
                try:
                    logger.info(f"Attempt {attempt + 1} to download OSM data...")
                    
                    # Try different approaches based on network type
                    if network_type == "drive":
                        G = ox.graph_from_place(
                            place_name, 
                            network_type="drive", 
                            simplify=True,
                            retain_all=False,
                            truncate_by_edge=True
                        )
                    elif network_type == "walk":
                        G = ox.graph_from_place(
                            place_name, 
                            network_type="walk", 
                            simplify=True,
                            retain_all=False
                        )
                    elif network_type == "bike":
                        G = ox.graph_from_place(
                            place_name, 
                            network_type="bike", 
                            simplify=True,
                            retain_all=False
                        )
                    else:  # all_private or other
                        G = ox.graph_from_place(
                            place_name, 
                            network_type="all_private", 
                            simplify=True,
                            retain_all=False
                        )
                    
                    if G is not None:
                        logger.info(f"Successfully downloaded OSM graph with {len(G.nodes)} nodes and {len(G.edges)} edges")
                        break
                        
                except Exception as e:
                    logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                    if attempt == max_retries - 1:
                        raise
                    
            if G is None:
                raise Exception("Failed to download OSM data after all attempts")
            
            # Convert to GeoDataFrames
            logger.info("Converting graph to GeoDataFrames...")
            nodes_gdf, edges_gdf = ox.graph_to_gdfs(G)
            
            # Clear existing road segments for this year
            logger.info(f"Clearing existing road segments for year {year}...")
            deleted_count = db.query(RoadSegment).filter(RoadSegment.year == year).delete()
            logger.info(f"Deleted {deleted_count} existing road segments")
            
            # Process and insert road segments
            logger.info("Processing and inserting road segments...")
            count = 0
            batch_size = 1000
            batch_data = []
            
            for idx, edge in edges_gdf.iterrows():
                try:
                    # Handle multi-index (u, v, key) or simple index
                    if isinstance(idx, tuple):
                        osm_id = f"{idx[0]}_{idx[1]}_{idx[2]}" if len(idx) > 2 else f"{idx[0]}_{idx[1]}"
                    else:
                        osm_id = str(idx)
                    
                    # Extract road information with better handling of missing data
                    name = self._extract_road_name(edge)
                    road_type = self._extract_road_type(edge)
                    lanes = self._extract_lanes(edge)
                    
                    # Convert geometry to WKT
                    geom_wkt = edge.geometry.wkt
                    
                    road_segment = RoadSegment(
                        osm_id=osm_id,
                        name=name,
                        road_type=road_type,
                        lanes=lanes,
                        year=year,
                        geometry=WKTElement(geom_wkt, srid=4326)
                    )
                    
                    batch_data.append(road_segment)
                    count += 1
                    
                    # Insert in batches for better performance
                    if len(batch_data) >= batch_size:
                        db.add_all(batch_data)
                        db.commit()
                        logger.info(f"Inserted batch of {len(batch_data)} road segments. Total: {count}")
                        batch_data = []
                    
                except Exception as e:
                    logger.warning(f"Error processing road segment {idx}: {e}")
                    continue
            
            # Insert remaining batch
            if batch_data:
                db.add_all(batch_data)
                db.commit()
                logger.info(f"Inserted final batch of {len(batch_data)} road segments")
            
            logger.info(f"Successfully loaded {count} road segments for year {year}")
            
            return {
                'year': year,
                'network_type': network_type,
                'road_segments_added': count,
                'nodes_count': len(nodes_gdf),
                'edges_count': len(edges_gdf),
                'bbox': self.bangalore_bbox
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error loading OSM data: {str(e)}")
            # Fallback to sample data if OSM download fails
            logger.info("Falling back to sample data generation...")
            return self._generate_and_insert_sample_data(year)
        finally:
            db.close()

    def _extract_road_name(self, edge) -> str:
        """Extract road name from OSM edge data."""
        name = edge.get('name', '')
        
        # Handle different name formats
        if isinstance(name, list):
            name = name[0] if name else 'Unnamed Road'
        elif pd.isna(name) or name == '':
            # Try alternative name fields
            name = edge.get('ref', edge.get('highway', 'Unnamed Road'))
        
        return str(name)[:255]  # Limit length for database

    def _extract_road_type(self, edge) -> str:
        """Extract road type from OSM edge data."""
        highway = edge.get('highway', 'unknown')
        
        # Handle list of highway types
        if isinstance(highway, list):
            highway = highway[0] if highway else 'unknown'
        
        # Map OSM highway types to simplified categories
        highway_mapping = {
            'motorway': 'highway',
            'trunk': 'highway',
            'primary': 'primary',
            'secondary': 'secondary',
            'tertiary': 'tertiary',
            'residential': 'residential',
            'service': 'service',
            'unclassified': 'local',
            'living_street': 'residential'
        }
        
        return highway_mapping.get(str(highway), str(highway))

    def _extract_lanes(self, edge) -> int:
        """Extract number of lanes from OSM edge data."""
        lanes = edge.get('lanes', 1)
        
        try:
            if isinstance(lanes, str):
                # Handle cases like "2;3" or "2-3"
                lanes = lanes.split(';')[0].split('-')[0]
            
            lanes_int = int(float(lanes))
            return max(1, min(lanes_int, 10))  # Reasonable bounds
        except (ValueError, TypeError):
            return 1  # Default to 1 lane

    def _generate_and_insert_sample_data(self, year: int) -> Dict[str, Any]:
        """Generate and insert sample road network data into database."""
        db_gen = get_db()
        db: Session = next(db_gen)
        
        try:
            # Clear existing road segments for this year
            db.query(RoadSegment).filter(RoadSegment.year == year).delete()
            
            # Generate sample roads for Bangalore
            sample_roads = self._generate_sample_roads()
            
            count = 0
            for road_data in sample_roads:
                try:
                    road_segment = RoadSegment(
                        osm_id=road_data['osm_id'],
                        name=road_data['name'],
                        road_type=road_data['road_type'],
                        lanes=road_data['lanes'],
                        year=year,
                        geometry=WKTElement(road_data['geometry_wkt'], srid=4326)
                    )
                    
                    db.add(road_segment)
                    count += 1
                    
                except Exception as e:
                    logger.warning(f"Error inserting sample road {road_data.get('name', 'unknown')}: {e}")
                    continue
            
            db.commit()
            logger.info(f"Successfully inserted {count} sample road segments for year {year}")
            
            return {
                'year': year,
                'network_type': 'sample',
                'road_segments_added': count,
                'nodes_count': count * 2,  # Approximate
                'edges_count': count
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error inserting sample road data: {str(e)}")
            raise
        finally:
            db.close()

    def _generate_sample_roads(self) -> List[Dict[str, Any]]:
        """Generate sample road data for Bangalore."""
        sample_roads = []
        
        # Major roads in Bangalore with approximate coordinates
        major_roads = [
            {
                'name': 'Outer Ring Road',
                'road_type': 'primary',
                'lanes': 6,
                'coordinates': [
                    [77.5946, 12.9716], [77.6346, 12.9716], [77.6346, 13.0116], [77.5946, 13.0116], [77.5946, 12.9716]
                ]
            },
            {
                'name': 'Hosur Road',
                'road_type': 'primary',
                'lanes': 4,
                'coordinates': [[77.5946, 12.9716], [77.6146, 12.8516]]
            },
            {
                'name': 'Bannerghatta Road',
                'road_type': 'secondary',
                'lanes': 4,
                'coordinates': [[77.5946, 12.9716], [77.5946, 12.8516]]
            },
            {
                'name': 'Whitefield Road',
                'road_type': 'secondary',
                'lanes': 4,
                'coordinates': [[77.5946, 12.9716], [77.7146, 12.9716]]
            },
            {
                'name': 'Mysore Road',
                'road_type': 'primary',
                'lanes': 4,
                'coordinates': [[77.5946, 12.9716], [77.4546, 12.9716]]
            }
        ]
        
        for i, road in enumerate(major_roads):
            coords_str = ','.join([f"{lon} {lat}" for lon, lat in road['coordinates']])
            geometry_wkt = f"LINESTRING({coords_str})"
            
            sample_roads.append({
                'osm_id': f"sample_{i+1}",
                'name': road['name'],
                'road_type': road['road_type'],
                'lanes': road['lanes'],
                'geometry_wkt': geometry_wkt
            })
        
        return sample_roads

    def generate_sample_road_network(self, year: int = 2024, network_type: str = "drive") -> Dict[str, Any]:
        """
        Generate road network data for Bangalore using OpenStreetMap.
        
        Args:
            year: Year for the road network (used for caching)
            network_type: Type of network ('drive', 'walk', 'bike', 'all_private')
            
        Returns:
            Dictionary containing road network GeoJSON and metadata
        """
        if not OSM_LIBS_AVAILABLE:
            logger.warning("OSM libraries not available. Generating sample data instead.")
            return self._generate_mock_road_network(year)
        
        try:
            logger.info(f"Downloading OSM road network for Bangalore (year: {year}, type: {network_type})")
            
            # Define Bangalore boundaries
            place_name = "Bengaluru, Karnataka, India"
            
            # Download road network from OSM
            G = ox.graph_from_place(place_name, network_type=network_type, simplify=True)
            
            # Convert to GeoDataFrames
            gdf_nodes, gdf_edges = ox.graph_to_gdfs(G)
            
            # Process nodes (intersections)
            nodes_geojson = self._nodes_to_geojson(gdf_nodes, year)
            
            # Process edges (road segments)
            edges_geojson = self._edges_to_geojson(gdf_edges, year)
            
            # Save processed data
            self._save_geojson(nodes_geojson, f"road_nodes_{year}.geojson")
            self._save_geojson(edges_geojson, f"road_network_{year}.geojson")
            
            # Generate statistics
            stats = {
                "node_count": len(gdf_nodes),
                "edge_count": len(gdf_edges),
                "total_length_km": round(gdf_edges['length'].sum() / 1000, 2),
                "network_type": network_type,
                "year": year,
                "place": place_name
            }
            
            logger.info(f"Successfully processed OSM road network: {stats}")
            
            return {
                "nodes_geojson": nodes_geojson,
                "edges_geojson": edges_geojson,
                "statistics": stats,
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"Error generating road network: {str(e)}")
            # Fallback to mock data
            return self._generate_mock_road_network(year)

    def _nodes_to_geojson(self, gdf_nodes: 'gpd.GeoDataFrame', year: int) -> Dict[str, Any]:
        """Convert OSM nodes to GeoJSON format."""
        if not OSM_LIBS_AVAILABLE:
            return {"type": "FeatureCollection", "features": []}
        
        features = []
        
        for idx, node in gdf_nodes.iterrows():
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [node.geometry.x, node.geometry.y]
                },
                "properties": {
                    "osmid": str(node.name),
                    "x": node.geometry.x,
                    "y": node.geometry.y,
                    "street_count": node.get('street_count', 0),
                    "year": year,
                    "node_type": "intersection"
                }
            }
            features.append(feature)
            
        return {
            "type": "FeatureCollection",
            "features": features
        }

    def _edges_to_geojson(self, gdf_edges: 'gpd.GeoDataFrame', year: int) -> Dict[str, Any]:
        """Convert OSM edges to GeoJSON format."""
        if not OSM_LIBS_AVAILABLE:
            return {"type": "FeatureCollection", "features": []}
        
        features = []
        
        for idx, edge in gdf_edges.iterrows():
            # Handle geometry
            if hasattr(edge.geometry, 'coords'):
                coordinates = list(edge.geometry.coords)
            else:
                coordinates = [[edge.geometry.x, edge.geometry.y]]
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                },
                "properties": {
                    "osmid": str(edge.get('osmid', '')),
                    "name": edge.get('name', ''),
                    "highway": edge.get('highway', ''),
                    "length": round(edge.get('length', 0), 2),
                    "maxspeed": edge.get('maxspeed', ''),
                    "lanes": edge.get('lanes', ''),
                    "oneway": edge.get('oneway', False),
                    "bridge": edge.get('bridge', ''),
                    "tunnel": edge.get('tunnel', ''),
                    "year": year,
                    "u": edge.name[0] if isinstance(edge.name, tuple) else edge.name,
                    "v": edge.name[1] if isinstance(edge.name, tuple) else edge.name,
                    "key": edge.name[2] if isinstance(edge.name, tuple) and len(edge.name) > 2 else 0
                }
            }
            features.append(feature)
            
        return {
            "type": "FeatureCollection",
            "features": features
        }

    def _generate_mock_road_network(self, year: int) -> Dict[str, Any]:
        """Generate mock road network data when OSM libraries are not available."""
        logger.info(f"Generating mock road network for year {year}")
        
        # Generate mock nodes
        nodes_features = []
        for i in range(100):  # 100 intersection nodes
            lon = self.bangalore_center[0] + random.uniform(-0.1, 0.1)
            lat = self.bangalore_center[1] + random.uniform(-0.1, 0.1)
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "osmid": f"mock_node_{i}",
                    "x": lon,
                    "y": lat,
                    "street_count": random.randint(2, 4),
                    "year": year,
                    "node_type": "intersection"
                }
            }
            nodes_features.append(feature)
        
        nodes_geojson = {"type": "FeatureCollection", "features": nodes_features}
        
        # Generate mock edges
        edges_features = []
        for i in range(200):  # 200 road segments
            start_lon = self.bangalore_center[0] + random.uniform(-0.1, 0.1)
            start_lat = self.bangalore_center[1] + random.uniform(-0.1, 0.1)
            end_lon = start_lon + random.uniform(-0.01, 0.01)
            end_lat = start_lat + random.uniform(-0.01, 0.01)
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[start_lon, start_lat], [end_lon, end_lat]]
                },
                "properties": {
                    "osmid": f"mock_edge_{i}",
                    "name": f"Mock Road {i}",
                    "highway": random.choice(["primary", "secondary", "tertiary", "residential"]),
                    "length": round(random.uniform(100, 2000), 2),
                    "maxspeed": random.choice(["30", "50", "60", "80"]),
                    "lanes": str(random.randint(1, 4)),
                    "oneway": random.choice([True, False]),
                    "year": year,
                    "u": f"node_{i}",
                    "v": f"node_{i+1}",
                    "key": 0
                }
            }
            edges_features.append(feature)
        
        edges_geojson = {"type": "FeatureCollection", "features": edges_features}
        
        # Save mock data
        self._save_geojson(nodes_geojson, f"road_nodes_{year}.geojson")
        self._save_geojson(edges_geojson, f"road_network_{year}.geojson")
        
        stats = {
            "node_count": len(nodes_features),
            "edge_count": len(edges_features),
            "total_length_km": round(sum(f["properties"]["length"] for f in edges_features) / 1000, 2),
            "network_type": "mock",
            "year": year,
            "place": "Bangalore (Mock Data)"
        }
        
        return {
            "nodes_geojson": nodes_geojson,
            "edges_geojson": edges_geojson,
            "statistics": stats,
            "status": "success"
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
