# backend/services/tomtom_service.py

import httpx
from fastapi import HTTPException
from ..config import settings # Use .. to import from the parent directory's config module

class TomTomService:
    """
    A service class to interact with the TomTom Traffic API.
    """
    def __init__(self):
        self.api_key = settings.TOMTOM_API_KEY
        self.base_url = "https://api.tomtom.com/traffic/services/4"

    async def get_traffic_incidents(self):
        """
        Fetches traffic incidents for the Bangalore bounding box.
        """
        incident_url = f"{self.base_url}/incidentDetails/s3/{settings.BANGALORE_BBOX}/12/json"
        params = {
            "key": self.api_key,
            "fields": "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitude,startTime,endTime,from,to,length,delay,roadNumbers,aci{probabilityOfOccurrence,numberOfReports,lastReportTime}}}}",
            "language": "en-GB",
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(incident_url, params=params)
                response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes
                return response.json()
            except httpx.HTTPStatusError as e:
                # Log the error and raise a more specific FastAPI exception
                print(f"TomTom API request failed: {e.response.status_code} - {e.response.text}")
                raise HTTPException(status_code=e.response.status_code, detail="Error fetching data from TomTom API.")
            except Exception as e:
                print(f"An unexpected error occurred: {e}")
                raise HTTPException(status_code=500, detail="An internal server error occurred.")

    async def get_traffic_flow(self):
        """
        Fetches traffic flow data.
        Note: The TomTom Flow API is extensive. This is a simplified example.
        We will return incident data as a proxy for flow for now, as flow requires
        more complex segmentation.
        """
        # For this example, we'll return incident data as a representation of traffic flow issues.
        # A full implementation would use the Flow Segment Data endpoint.
        return await self.get_traffic_incidents()

