#!/usr/bin/env python3
"""
Data Loading CLI Script for Transport Analysis Backend

This script provides a command-line interface to load local GTFS, GeoJSON,
and Pickle network data into the database.

Setup:
1. Place this script in a 'scripts' directory inside your 'backend' folder.
2. Ensure your local data is in the 'data' directory as expected.
   - GTFS files: 'data/gtfs/your_dir/'.
   - GeoJSON/Pickle files: 'data/geojson/'.
3. Run 'python create_tables.py' once to ensure the database and tables exist.

Usage:
    # Load GTFS data from a directory for a specific year
    python scripts/load_data.py load-gtfs --dir "bmtc" --year 2013

    # Load a local GeoJSON road network for a specific year
    python scripts/load_data.py load-geojson-network --year 2023

    # Load a local Pickle road network for a specific year
    python scripts/load_data.py load-pickle --file "your_file.pkl" --year 2023

    # Load all local data for a range of years
    python scripts/load_data.py load-all-local --start-year 2014 --end-year 2025 --gtfs-dir "bmtc"
    
    # Clear data for a specific year
    python scripts/load_data.py clear-data --year 2023
"""

import argparse
import sys
import os
import logging
from pathlib import Path
import pandas as pd
import geopandas as gpd
from shapely.geometry import mapping
import json

# Add the backend directory to Python path for module imports
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from app.db import SessionLocal
    from app.db.models import RoadSegment, BusStop, BusRoute
    from app.core.config import settings
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please ensure you are running this from the 'backend' directory"
          " and that the script is located in 'backend/scripts/'.")
    sys.exit(1)

# --- Logging Configuration ---
log_dir = backend_dir / "logs"
log_dir.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_dir / 'data_loading.log')
    ]
)
logger = logging.getLogger(__name__)

# --- GTFS Data Loading ---

def load_gtfs_data(gtfs_dir_name: str, year: int):
    """Parses GTFS files from a directory and loads them into the database."""
    logger.info(f"--- Starting GTFS Load from directory '{gtfs_dir_name}' (Year: {year}) ---")
    gtfs_path = settings.GTFS_DIR / gtfs_dir_name
    if not gtfs_path.is_dir():
        logger.error(f"GTFS directory not found at {gtfs_path}")
        return False

    db = SessionLocal()
    try:
        db.query(BusStop).filter(BusStop.year == year).delete()
        db.query(BusRoute).filter(BusRoute.year == year).delete()
        logger.info(f"Cleared existing GTFS data for year {year}.")

        stops_df = pd.read_csv(gtfs_path / 'stops.txt')
        stops_to_add = [
            BusStop(
                stop_id=row['stop_id'], name=row['stop_name'],
                code=row.get('stop_code'), description=row.get('stop_desc'),
                zone_id=row.get('zone_id'), year=year,
                geometry={"type": "Point", "coordinates": [row['stop_lon'], row['stop_lat']]}
            ) for _, row in stops_df.iterrows()
        ]
        db.add_all(stops_to_add)
        logger.info(f"Prepared {len(stops_to_add)} bus stops for insertion.")

        db.commit()
        logger.info("Successfully committed GTFS data to the database.")
        return True
    except Exception as e:
        db.rollback()
        logger.exception(f"Failed to load GTFS data: {e}")
        return False
    finally:
        db.close()

# --- Network Data Loading ---

def load_network_from_gdf(gdf: gpd.GeoDataFrame, year: int, db: SessionLocal):
    """Generic function to load road segments from a GeoDataFrame into the database."""
    db.query(RoadSegment).filter(RoadSegment.year == year).delete()
    logger.info(f"Cleared existing road network data for year {year}.")
    
    segments_to_add = [
        RoadSegment(
            osm_id=str(row.get('osmid', row.get('id', ''))), name=str(row.get('name', '')),
            road_type=str(row.get('highway', '')), lanes=row.get('lanes'),
            year=year, geometry=mapping(row.geometry)
        ) for _, row in gdf.iterrows() if row.geometry is not None
    ]
    
    db.add_all(segments_to_add)
    logger.info(f"Prepared {len(segments_to_add)} road segments for insertion.")
    db.commit()
    logger.info("Successfully committed road segments to the database.")

def load_geojson_network(year: int):
    """Loads a local GeoJSON road network file into the database."""
    logger.info(f"--- Starting Local GeoJSON Road Network Load for {year} ---")
    file_path = settings.GEOJSON_DIR / f"data_{year}.geojson"
    if not file_path.exists():
        logger.error(f"GeoJSON file not found for year {year} at {file_path}")
        return False

    db = SessionLocal()
    try:
        gdf = gpd.read_file(file_path)
        logger.info(f"Read {len(gdf)} features from {file_path.name}.")
        load_network_from_gdf(gdf, year, db)
        return True
    except Exception as e:
        db.rollback()
        logger.exception(f"Failed to load GeoJSON network data: {e}")
        return False
    finally:
        db.close()

def load_pickle_network(file_name: str, year: int):
    """Loads a local pickle file containing a GeoDataFrame into the database."""
    logger.info(f"--- Starting Local Pickle Network Load for {year} ---")
    file_path = settings.GEOJSON_DIR / file_name
    if not file_path.exists():
        logger.error(f"Pickle file not found at {file_path}")
        return False
        
    db = SessionLocal()
    try:
        gdf = pd.read_pickle(file_path)
        if not isinstance(gdf, gpd.GeoDataFrame):
            logger.error(f"Pickle file at {file_path} does not contain a GeoDataFrame.")
            return False
        logger.info(f"Read {len(gdf)} features from {file_path.name}.")
        load_network_from_gdf(gdf, year, db)
        return True
    except Exception as e:
        db.rollback()
        logger.exception(f"Failed to load Pickle network data: {e}")
        return False
    finally:
        db.close()

# --- Combined Data Loading ---

def load_all_local_data(start_year: int, end_year: int, gtfs_dir: str):
    """Loads all available local data for a given range of years."""
    logger.info(f"--- Starting Full Local Data Load for years {start_year}-{end_year} ---")
    
    logger.info("Loading GTFS data for all years...")
    for year in range(start_year, end_year + 1):
        if not load_gtfs_data(gtfs_dir, year):
            logger.error(f"Could not load GTFS for year {year}. Stopping GTFS load.")
            break

    for year in range(start_year, end_year + 1):
        logger.info(f"Loading road network for {year}...")
        load_geojson_network(year)
    
    logger.info("--- Full Local Data Load Process Finished ---")

# --- Data Clearing ---

def clear_data(year: int):
    """Clears all transport data for a specific year from the database."""
    logger.info(f"--- Clearing All Data for Year {year} ---")
    response = input(f"Are you sure you want to delete all data for year {year}? (y/N): ")
    if response.lower() != 'y':
        print("Operation cancelled.")
        return

    db = SessionLocal()
    try:
        deleted_roads = db.query(RoadSegment).filter(RoadSegment.year == year).delete()
        deleted_stops = db.query(BusStop).filter(BusStop.year == year).delete()
        deleted_routes = db.query(BusRoute).filter(BusRoute.year == year).delete()
        db.commit()
        logger.info("Commit successful.")
        print(f"Successfully deleted {deleted_roads} road segments, {deleted_stops} bus stops, and {deleted_routes} bus routes.")
    except Exception as e:
        db.rollback()
        logger.exception(f"Failed to clear data: {e}")
    finally:
        db.close()

# --- Main CLI ---

def main():
    parser = argparse.ArgumentParser(description="Data loading and management CLI for the TransiGenius backend.", formatter_class=argparse.RawTextHelpFormatter)
    subparsers = parser.add_subparsers(dest='command', help='Available commands', required=True)

    gtfs_parser = subparsers.add_parser('load-gtfs', help='Load GTFS data from a local directory.')
    gtfs_parser.add_argument('--dir', required=True, help='Name of the GTFS directory inside data/gtfs/.')
    gtfs_parser.add_argument('--year', type=int, required=True, help='The year this data represents.')

    geojson_parser = subparsers.add_parser('load-geojson-network', help='Load a local GeoJSON road network file.')
    geojson_parser.add_argument('--year', type=int, required=True, help='The year of the data_YYYY.geojson file to load.')

    pickle_parser = subparsers.add_parser('load-pickle', help='Load a road network from a local .pkl file.')
    pickle_parser.add_argument('--file', required=True, help='Filename of the .pkl file inside data/geojson/.')
    pickle_parser.add_argument('--year', type=int, required=True, help='The year this data represents.')

    all_local_parser = subparsers.add_parser('load-all-local', help='Load all local GTFS and GeoJSON data for a range of years.')
    all_local_parser.add_argument('--start-year', type=int, required=True, help='The first year in the range.')
    all_local_parser.add_argument('--end-year', type=int, required=True, help='The last year in the range.')
    all_local_parser.add_argument('--gtfs-dir', required=True, help='Name of the GTFS directory to use for all years.')
    
    clear_parser = subparsers.add_parser('clear-data', help='Clear all data for a specific year.')
    clear_parser.add_argument('--year', type=int, required=True, help='The year to clear data for.')

    args = parser.parse_args()

    if args.command == 'load-gtfs':
        load_gtfs_data(args.dir, args.year)
    elif args.command == 'load-geojson-network':
        load_geojson_network(args.year)
    elif args.command == 'load-pickle':
        load_pickle_network(args.file, args.year)
    elif args.command == 'load-all-local':
        load_all_local_data(args.start_year, args.end_year, args.gtfs_dir)
    elif args.command == 'clear-data':
        clear_data(args.year)

if __name__ == "__main__":
    try:
        from app.db import init_db
        print("Initializing database connection...")
        init_db()
        main()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
    except Exception as e:
        logger.exception(f"A critical error occurred: {e}")
