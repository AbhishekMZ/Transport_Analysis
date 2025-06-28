import os
import time as time_module  # Renamed to avoid conflict
import sqlite3
import pandas as pd
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import requests
from dotenv import load_dotenv
import logging
import argparse
import sys
from traffic_config import MONITOR_POINTS, COLLECTION_INTERVAL, API_TIMEOUT, MAX_RETRIES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('traffic_collector')

# Load environment variables
load_dotenv()

def parse_args():
    parser = argparse.ArgumentParser(description='Traffic Data Collector')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    parser.add_argument('--once', action='store_true', help='Run collection once and exit')
    return parser.parse_args()

class TrafficDataCollector:
    def __init__(self, db_path: str = "traffic_data.db"):
        self.api_key = os.getenv('TOMTOM_API_KEY')
        self.db_path = db_path
        self._init_db()
        self._verify_api_key()
        
    def _verify_api_key(self) -> bool:
        """Verify that the API key is valid"""
        if not self.api_key:
            logger.error("TOMTOM_API_KEY is not set in .env file")
            return False
            
        test_url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
        params = {
            'point': '12.9716,77.5946',  # MG Road
            'unit': 'KMPH',
            'key': self.api_key,
            'zoom': 12
        }
        
        try:
            logger.debug(f"Testing API key with URL: {test_url}")
            response = requests.get(test_url, params=params, timeout=10)
            if response.status_code == 200:
                logger.info("API key is valid and working")
                return True
            elif response.status_code == 403:
                logger.error("Invalid API key. Please check your TOMTOM_API_KEY")
            else:
                logger.error(f"API error (HTTP {response.status_code}): {response.text[:200]}")
        except Exception as e:
            logger.exception(f"Failed to connect to TomTom API: {str(e)}")
        
        return False
        
    def _init_db(self):
        """Initialize SQLite database for storing traffic data"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS traffic_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    point_name TEXT,
                    latitude REAL,
                    longitude REAL,
                    timestamp DATETIME,
                    current_speed REAL,
                    free_flow_speed REAL,
                    traffic_incidents INTEGER
                )
            ''')
            conn.commit()
    
    def get_traffic_data(self, point: 'RoutePoint') -> Dict[str, Any]:
        """Get traffic data for a specific point with retry logic"""
        # Using Traffic Flow API v4 (most stable version) with direct URL construction
        url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={point.lat},{point.lon}&unit=KMPH&key={self.api_key}"
        
        if not self.api_key:
            print("❌ API key is not set. Please set TOMTOM_API_KEY in .env file")
            return None
        
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = requests.get(url, timeout=API_TIMEOUT)
                print(f"Response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Get incident count if we have valid data
                    traffic_incidents = self._get_incident_count(point.lat, point.lon) if data.get('flowSegmentData') else 0
                    
                    return {
                        'point_name': point.name,
                        'latitude': point.lat,
                        'longitude': point.lon,
                        'timestamp': datetime.utcnow().isoformat(),
                        'current_speed': data.get('flowSegmentData', {}).get('currentSpeed'),
                        'free_flow_speed': data.get('flowSegmentData', {}).get('freeFlowSpeed'),
                        'traffic_incidents': traffic_incidents
                    }
                else:
                    print(f"Error status code: {response.status_code}")
                    print(f"Response content: {response.text[:200]}...")
                    last_error = Exception(f"HTTP {response.status_code}: {response.text[:100]}")
                    if attempt < MAX_RETRIES - 1:
                        time_module.sleep(1 * (attempt + 1))
                        continue
                
            except requests.exceptions.RequestException as e:
                last_error = e
                if attempt < MAX_RETRIES - 1:  # Don't sleep on the last attempt
                    time_module.sleep(1 * (attempt + 1))  # Exponential backoff
                continue
            except Exception as e:
                last_error = e
                break
        
        print(f"❌ Failed to get traffic data for {point.name} after {MAX_RETRIES} attempts")
        if last_error:
            print(f"   Error: {str(last_error)}")
        return None
    
    def _get_incident_count(self, lat: float, lon: float, radius_km: int = 2) -> int:
        """Get number of traffic incidents in the area with retry logic"""
        # Using Traffic Incidents API v4 (most stable version) with direct URL construction
        bbox = self._calculate_bounding_box(lat, lon, radius_km)
        url = f"https://api.tomtom.com/traffic/services/4/incidentDetails/s3/{bbox}/10/-1/json?key={self.api_key}&language=en-GB"
        
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = requests.get(url, timeout=API_TIMEOUT)
                print(f"Incident API response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    return len(data.get('incidents', []))
                else:
                    print(f"Incident API error: {response.status_code}")
                    print(f"Content: {response.text[:100]}...")
                    last_error = Exception(f"HTTP {response.status_code}: {response.text[:100]}")
                    if attempt < MAX_RETRIES - 1:
                        time_module.sleep(1 * (attempt + 1))
                        continue
                
            except requests.exceptions.RequestException as e:
                last_error = e
                if attempt < MAX_RETRIES - 1:  # Don't sleep on the last attempt
                    time_module.sleep(1 * (attempt + 1))  # Exponential backoff
                continue
            except Exception as e:
                last_error = e
                break
        
        print(f"⚠️  Failed to get incident data after {MAX_RETRIES} attempts")
        if last_error:
            print(f"   Error: {str(last_error)}")
        return 0  # Return 0 incidents if we can't get the data
    
    def _calculate_bounding_box(self, lat: float, lon: float, radius_km: int) -> str:
        """Calculate bounding box coordinates for incident search"""
        # Approximate conversion: 1 degree ~ 111 km
        lat_delta = radius_km / 111
        lon_delta = radius_km / (111 * abs(lat) / 90)
        
        min_lat = lat - lat_delta
        max_lat = lat + lat_delta
        min_lon = lon - lon_delta
        max_lon = lon + lon_delta
        
        return f"{min_lon},{min_lat},{max_lon},{max_lat}"
    
    def save_traffic_data(self, data: Dict[str, Any]):
        """Save traffic data to database"""
        if not data:
            return
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO traffic_data 
                (point_name, latitude, longitude, timestamp, current_speed, free_flow_speed, traffic_incidents)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['point_name'],
                data['latitude'],
                data['longitude'],
                data['timestamp'],
                data['current_speed'],
                data['free_flow_speed'],
                data['traffic_incidents']
            ))
            conn.commit()
    
    def collect_data(self, run_once: bool = False):
        """
        Main method to collect traffic data for all monitor points
        
        Args:
            run_once: If True, run collection once and exit
        """
        logger.info(f"Starting traffic data collection (interval: {COLLECTION_INTERVAL}s)")
        logger.info(f"Monitoring {len(MONITOR_POINTS)} locations")
        
        try:
            while True:
                start_time = time_module.time()
                timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                logger.info(f"Starting data collection cycle at {timestamp}")
                
                success_count = 0
                for i, point in enumerate(MONITOR_POINTS, 1):
                    try:
                        # Handle both dictionary and object access patterns
                        point_name = point.get('name', 'Unnamed') if hasattr(point, 'get') else getattr(point, 'name', 'Unnamed')
                        logger.debug(f"Processing point {i}/{len(MONITOR_POINTS)}: {point_name}")
                        if self._collect_point_data(point):
                            success_count += 1
                    except Exception as e:
                        point_name = point.get('name', 'Unnamed') if hasattr(point, 'get') else getattr(point, 'name', 'Unnamed')
                        logger.error(f"Error processing {point_name}: {str(e)}", exc_info=True)
                
                elapsed = time_module.time() - start_time
                logger.info(f"Completed cycle: {success_count}/{len(MONITOR_POINTS)} points collected in {elapsed:.1f}s")
                
                if run_once:
                    logger.info("Run once mode: Exiting after one collection cycle")
                    break
                
                # Calculate sleep time, ensuring we don't go negative
                sleep_time = max(0, COLLECTION_INTERVAL - elapsed)
                if sleep_time > 0:
                    logger.debug(f"Sleeping for {sleep_time:.1f} seconds")
                    time_module.sleep(sleep_time)
                
        except KeyboardInterrupt:
            logger.info("Data collection stopped by user")
        except Exception as e:
            logger.exception("Fatal error in collection loop")
            raise

    def _collect_point_data(self, point):
        """Collect traffic data for a single point"""
        try:
            # Handle both dictionary and object access patterns
            point_name = point.get('name', 'Unnamed') if hasattr(point, 'get') else getattr(point, 'name', 'Unnamed')
            logger.debug(f"Collecting data for point: {point_name}")
            
            data = self.get_traffic_data(point)
            if data:
                self.save_traffic_data(data)
                return True
            return False
        except Exception as e:
            point_name = point.get('name', 'Unnamed') if hasattr(point, 'get') else getattr(point, 'name', 'Unnamed')
            logger.error(f"Error in _collect_point_data for {point_name}: {str(e)}", exc_info=True)
            return False

if __name__ == "__main__":
    args = parse_args()
    
    # Set debug logging if requested
    if args.debug:
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    
    try:
        collector = TrafficDataCollector()
        logger.info("Starting traffic data collection...")
        collector.collect_data(run_once=args.once)
        logger.info("Traffic data collection finished")
    except KeyboardInterrupt:
        logger.info("Traffic collection stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)
