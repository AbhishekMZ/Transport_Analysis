# backend/services/local_data_service.py

import pandas as pd
import json
from fastapi import HTTPException
import os

class LocalDataService:
    """
    A service to read local data files like GTFS and GeoJSON.
    """
    def __init__(self):
        # Define the base path relative to the location of this script
        self.base_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Public-Transport-Analysis')
        self.bmtc_path = os.path.join(self.base_path, 'bmtc')

    def get_gtfs_routes(self):
        """
        Reads the routes.txt file from the BMTC GTFS data.
        """
        routes_file_path = os.path.join(self.bmtc_path, 'routes.txt')
        try:
            df = pd.read_csv(routes_file_path)
            # Convert dataframe to a list of dictionaries for JSON response
            return df.to_dict(orient='records')
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"GTFS routes file not found at {routes_file_path}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading GTFS data: {e}")

    def get_temporal_geojson(self, year: int, layer: str):
        """
        Loads a specific GeoJSON file.
        This is a placeholder and assumes a file naming convention.
        """
        # Note: The yearly files data_2014.geojson etc. were not found.
        # This function will load 'export.json' as a default example.
        # You can adapt the logic here if you add more files.
        file_path = os.path.join(self.base_path, 'export.json')
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            return data
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"GeoJSON file not found at {file_path}")
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail=f"Error decoding JSON from file: {file_path}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading GeoJSON file: {e}")

