"""
GTFS data processing service for parsing and handling GTFS datasets.
"""

import os
import pandas as pd
import zipfile
import logging
import geojson
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from geoalchemy2 import WKTElement

from app.core.config import settings
from app.db.models import BusStop, BusRoute, MetroStation, MetroLine
from app.db import get_db

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

    def process_gtfs_feed(self, feed_name: str, year: Optional[int] = None) -> Dict[str, Any]:
        """
        Process a GTFS feed and extract relevant data, inserting into database.
        
        Args:
            feed_name: Name of the GTFS feed file (e.g., 'bmtc.zip')
            year: Year of the data (extracted from filename if not provided)
            
        Returns:
            Dictionary containing processed GTFS data statistics
        """
        feed_path = self.gtfs_dir / feed_name
        
        if not feed_path.exists():
            # Check in Public-Transport-Analysis directory
            alt_path = settings.PUBLIC_TRANSPORT_ANALYSIS_DIR / feed_name
            if alt_path.exists():
                feed_path = alt_path
            else:
                raise FileNotFoundError(f"GTFS feed not found: {feed_name}")
        
        if not year:
            year = self._extract_year_from_filename(feed_name)
        
        logger.info(f"Processing GTFS feed: {feed_path} for year {year}")
        
        # Get database session
        db_gen = get_db()
        db: Session = next(db_gen)
        
        try:
            with zipfile.ZipFile(feed_path, 'r') as zip_file:
                stats = {
                    'year': year,
                    'bus_stops_added': 0,
                    'bus_routes_added': 0,
                    'metro_stations_added': 0,
                    'metro_lines_added': 0,
                    'errors': []
                }
                
                # Process stops.txt
                if 'stops.txt' in zip_file.namelist():
                    stops_df = pd.read_csv(zip_file.open('stops.txt'))
                    stats['bus_stops_added'] = self._process_and_insert_stops(db, stops_df, year)
                
                # Process routes.txt and shapes.txt for bus routes
                if 'routes.txt' in zip_file.namelist():
                    routes_df = pd.read_csv(zip_file.open('routes.txt'))
                    shapes_data = {}
                    
                    if 'shapes.txt' in zip_file.namelist():
                        shapes_df = pd.read_csv(zip_file.open('shapes.txt'))
                        shapes_data = self._process_shapes(shapes_df)
                    
                    # Get trips to link routes with shapes
                    trips_data = {}
                    if 'trips.txt' in zip_file.namelist():
                        trips_df = pd.read_csv(zip_file.open('trips.txt'))
                        trips_data = self._process_trips(trips_df)
                    
                    stats['bus_routes_added'] = self._process_and_insert_routes(
                        db, routes_df, shapes_data, trips_data, year
                    )
                    
                    # Process metro stations
                    stats['metro_stations_added'] = self._process_and_insert_metro_stations(
                        db, stops_df, routes_df, year
                    )
                
                db.commit()
                logger.info(f"Successfully processed GTFS feed: {feed_name}")
                logger.info(f"Statistics: {stats}")
                return stats
                
        except Exception as e:
            db.rollback()
            logger.error(f"Error processing GTFS feed {feed_name}: {str(e)}")
            raise
        finally:
            db.close()

    def _process_and_insert_stops(self, db: Session, stops_df: pd.DataFrame, year: int) -> int:
        """Process and insert bus stops into database."""
        count = 0
        
        # Clear existing stops for this year
        db.query(BusStop).filter(BusStop.year == year).delete()
        
        for _, row in stops_df.iterrows():
            try:
                # Create point geometry from lat/lon
                point_wkt = f"POINT({row['stop_lon']} {row['stop_lat']})"
                
                bus_stop = BusStop(
                    stop_id=str(row['stop_id']),
                    name=row.get('stop_name', ''),
                    code=row.get('stop_code', ''),
                    description=row.get('stop_desc', ''),
                    zone_id=row.get('zone_id', ''),
                    year=year,
                    geometry=WKTElement(point_wkt, srid=4326)
                )
                
                db.add(bus_stop)
                count += 1
                
                if count % 100 == 0:
                    logger.info(f"Processed {count} bus stops...")
                
            except Exception as e:
                logger.warning(f"Error processing stop {row.get('stop_id', 'unknown')}: {e}")
                continue
        
        return count

    def _process_and_insert_routes(self, db: Session, routes_df: pd.DataFrame, 
                                   shapes_data: Dict, trips_data: Dict, year: int) -> int:
        """Process and insert bus routes into database."""
        count = 0
        
        # Clear existing routes for this year
        db.query(BusRoute).filter(BusRoute.year == year).delete()
        
        # Create a mapping from route_id to shape_id via trips
        route_to_shape = {}
        for trip in trips_data.values():
            if trip.get('shape_id'):
                route_to_shape[trip['route_id']] = trip['shape_id']
        
        for _, row in routes_df.iterrows():
            try:
                route_id = str(row['route_id'])
                
                # Get geometry from shapes if available
                geometry_wkt = None
                if route_id in route_to_shape:
                    shape_id = route_to_shape[route_id]
                    if shape_id in shapes_data:
                        coordinates = shapes_data[shape_id]
                        if len(coordinates) > 1:
                            coords_str = ','.join([f"{lon} {lat}" for lon, lat in coordinates])
                            geometry_wkt = f"LINESTRING({coords_str})"
                
                # Determine if this is a metro route (route_type = 1) or bus route (route_type = 3)
                route_type = int(row.get('route_type', 3))
                
                if route_type == 1:  # Metro
                    # Insert as metro line
                    metro_line = MetroLine(
                        line_id=route_id,
                        name=row.get('route_long_name', row.get('route_short_name', '')),
                        color=f"#{row.get('route_color', '0066CC')}",
                        year=year,
                        geometry=WKTElement(geometry_wkt, srid=4326) if geometry_wkt else None
                    )
                    db.add(metro_line)
                else:  # Bus or other
                    bus_route = BusRoute(
                        route_id=route_id,
                        name=row.get('route_long_name', row.get('route_short_name', '')),
                        agency=row.get('agency_id', 'BMTC'),
                        color=f"#{row.get('route_color', 'FF0000')}",
                        year=year,
                        geometry=WKTElement(geometry_wkt, srid=4326) if geometry_wkt else None
                    )
                    db.add(bus_route)
                
                count += 1
                
                if count % 50 == 0:
                    logger.info(f"Processed {count} routes...")
                
            except Exception as e:
                logger.warning(f"Error processing route {row.get('route_id', 'unknown')}: {e}")
                continue
        
        return count

    def _process_and_insert_metro_stations(self, db: Session, stops_df: pd.DataFrame, 
                                          routes_df: pd.DataFrame, year: int) -> int:
        """Process and insert metro stations into database."""
        count = 0
        
        # Clear existing metro stations for this year
        db.query(MetroStation).filter(MetroStation.year == year).delete()
        
        # Get metro routes (route_type = 1)
        metro_routes = routes_df[routes_df['route_type'] == 1] if 'route_type' in routes_df.columns else pd.DataFrame()
        
        if metro_routes.empty:
            logger.info("No metro routes found in GTFS data")
            return 0
        
        # Filter stops that are metro stations (location_type = 1 or associated with metro routes)
        for _, row in stops_df.iterrows():
            try:
                location_type = int(row.get('location_type', 0))
                
                # Consider it a metro station if location_type is 1 or if it's associated with metro routes
                if location_type == 1 or any(keyword in str(row.get('stop_name', '')).lower() 
                                           for keyword in ['metro', 'station', 'interchange']):
                    
                    point_wkt = f"POINT({row['stop_lon']} {row['stop_lat']})"
                    
                    # Try to determine which metro line this station belongs to
                    line_id = 'unknown'
                    if not metro_routes.empty:
                        line_id = str(metro_routes.iloc[0]['route_id'])  # Default to first metro route
                    
                    metro_station = MetroStation(
                        station_id=str(row['stop_id']),
                        name=row.get('stop_name', ''),
                        line_id=line_id,
                        year=year,
                        geometry=WKTElement(point_wkt, srid=4326)
                    )
                    
                    db.add(metro_station)
                    count += 1
                    
            except Exception as e:
                logger.warning(f"Error processing metro station {row.get('stop_id', 'unknown')}: {e}")
                continue
        
        return count

    def _process_stops(self, stops_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Process GTFS stops data."""
        stops = []
        for _, row in stops_df.iterrows():
            stop = {
                'stop_id': row['stop_id'],
                'stop_name': row.get('stop_name', ''),
                'stop_lat': float(row['stop_lat']),
                'stop_lon': float(row['stop_lon']),
                'location_type': row.get('location_type', 0),
                'parent_station': row.get('parent_station', ''),
                'stop_code': row.get('stop_code', ''),
                'stop_desc': row.get('stop_desc', ''),
                'zone_id': row.get('zone_id', ''),
                'stop_url': row.get('stop_url', ''),
                'stop_timezone': row.get('stop_timezone', '')
            }
            stops.append(stop)
        return stops

    def _process_routes(self, routes_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Process GTFS routes data."""
        routes = []
        for _, row in routes_df.iterrows():
            route = {
                'route_id': row['route_id'],
                'agency_id': row.get('agency_id', ''),
                'route_short_name': row.get('route_short_name', ''),
                'route_long_name': row.get('route_long_name', ''),
                'route_desc': row.get('route_desc', ''),
                'route_type': int(row.get('route_type', 3)),  # 3 = Bus
                'route_url': row.get('route_url', ''),
                'route_color': row.get('route_color', ''),
                'route_text_color': row.get('route_text_color', '')
            }
            routes.append(route)
        return routes

    def _process_shapes(self, shapes_df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
        """Process GTFS shapes data to create route geometries."""
        shapes = {}
        for shape_id in shapes_df['shape_id'].unique():
            shape_points = shapes_df[shapes_df['shape_id'] == shape_id].sort_values('shape_pt_sequence')
            coordinates = []
            for _, point in shape_points.iterrows():
                coordinates.append([float(point['shape_pt_lon']), float(point['shape_pt_lat'])])
            shapes[shape_id] = coordinates
        return shapes

    def _process_trips(self, trips_df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        """Process GTFS trips data."""
        trips = {}
        for _, row in trips_df.iterrows():
            trip = {
                'route_id': row['route_id'],
                'service_id': row['service_id'],
                'trip_id': row['trip_id'],
                'trip_headsign': row.get('trip_headsign', ''),
                'trip_short_name': row.get('trip_short_name', ''),
                'direction_id': row.get('direction_id', 0),
                'block_id': row.get('block_id', ''),
                'shape_id': row.get('shape_id', ''),
                'wheelchair_accessible': row.get('wheelchair_accessible', 0),
                'bikes_allowed': row.get('bikes_allowed', 0)
            }
            trips[row['trip_id']] = trip
        return trips

    def _process_stop_times(self, stop_times_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Process GTFS stop_times data."""
        stop_times = []
        for _, row in stop_times_df.iterrows():
            stop_time = {
                'trip_id': row['trip_id'],
                'arrival_time': row.get('arrival_time', ''),
                'departure_time': row.get('departure_time', ''),
                'stop_id': row['stop_id'],
                'stop_sequence': int(row['stop_sequence']),
                'stop_headsign': row.get('stop_headsign', ''),
                'pickup_type': row.get('pickup_type', 0),
                'drop_off_type': row.get('drop_off_type', 0),
                'shape_dist_traveled': row.get('shape_dist_traveled', 0)
            }
            stop_times.append(stop_time)
        return stop_times

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
            geojson.dump(data, f)
            
        logger.info(f"Saved GeoJSON file: {filepath}")


# Create singleton instance
gtfs_service = GTFSService()
