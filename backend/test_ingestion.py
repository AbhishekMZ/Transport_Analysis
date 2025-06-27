#!/usr/bin/env python3
"""
Test script to demonstrate data ingestion functionality.
Run this after starting the FastAPI server to test the ingestion endpoints.
"""

import requests
import time
import json
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000/api/v1/ingestion"
HEADERS = {"Content-Type": "application/json"}


def test_ingestion_status():
    """Test the ingestion status endpoint."""
    print("🔍 Testing ingestion status...")
    
    try:
        response = requests.get(f"{BASE_URL}/status")
        if response.status_code == 200:
            data = response.json()
            print("✅ Status endpoint working")
            print(f"   Database stats: {len(data.get('database_stats', {}))} years with data")
            print(f"   GTFS feeds: {data.get('available_sources', {}).get('gtfs_feeds', 0)}")
            print(f"   OSM networks: {data.get('available_sources', {}).get('osm_networks', 0)}")
            return True
        else:
            print(f"❌ Status endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing status: {e}")
        return False


def test_list_feeds():
    """Test listing available feeds."""
    print("\n📋 Testing feed listing...")
    
    try:
        response = requests.get(f"{BASE_URL}/feeds")
        if response.status_code == 200:
            data = response.json()
            print("✅ Feeds endpoint working")
            print(f"   GTFS feeds found: {len(data.get('gtfs_feeds', []))}")
            print(f"   OSM networks found: {len(data.get('osm_networks', []))}")
            
            # Print feed details
            for feed in data.get('gtfs_feeds', [])[:3]:  # Show first 3
                print(f"   📁 {feed.get('name', 'Unknown')}")
            
            return data
        else:
            print(f"❌ Feeds endpoint failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error testing feeds: {e}")
        return None


def test_gtfs_ingestion(feed_name: str = "bmtc.zip"):
    """Test GTFS data ingestion."""
    print(f"\n🚌 Testing GTFS ingestion for {feed_name}...")
    
    try:
        payload = {
            "feed_name": feed_name,
            "year": 2024,
            "force_reload": False
        }
        
        response = requests.post(f"{BASE_URL}/gtfs", json=payload, headers=HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GTFS ingestion started: {data.get('status')}")
            print(f"   Message: {data.get('message')}")
            task_id = data.get('task_id')
            
            if task_id:
                # Monitor task progress
                return monitor_task(task_id)
            return True
        else:
            print(f"❌ GTFS ingestion failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing GTFS ingestion: {e}")
        return False


def test_osm_ingestion():
    """Test OSM data ingestion."""
    print("\n🛣️  Testing OSM ingestion...")
    
    try:
        payload = {
            "year": 2024,
            "network_type": "drive",
            "force_reload": False
        }
        
        response = requests.post(f"{BASE_URL}/osm", json=payload, headers=HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ OSM ingestion started: {data.get('status')}")
            print(f"   Message: {data.get('message')}")
            task_id = data.get('task_id')
            
            if task_id:
                # Monitor task progress
                return monitor_task(task_id)
            return True
        else:
            print(f"❌ OSM ingestion failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing OSM ingestion: {e}")
        return False


def monitor_task(task_id: str, max_wait: int = 300) -> bool:
    """Monitor a background task until completion."""
    print(f"⏳ Monitoring task: {task_id}")
    
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        try:
            response = requests.get(f"{BASE_URL}/task/{task_id}")
            
            if response.status_code == 200:
                data = response.json()
                status = data.get('status')
                progress = data.get('progress', 0)
                
                print(f"   Status: {status}, Progress: {progress}%")
                
                if status == 'completed':
                    result = data.get('result', {})
                    print("✅ Task completed successfully!")
                    
                    # Print results
                    if 'bus_stops_added' in result:
                        print(f"   📍 Bus stops: {result.get('bus_stops_added', 0)}")
                    if 'bus_routes_added' in result:
                        print(f"   🚌 Bus routes: {result.get('bus_routes_added', 0)}")
                    if 'metro_stations_added' in result:
                        print(f"   🚇 Metro stations: {result.get('metro_stations_added', 0)}")
                    if 'road_segments_added' in result:
                        print(f"   🛣️  Road segments: {result.get('road_segments_added', 0)}")
                    
                    return True
                    
                elif status == 'failed':
                    error = data.get('error', 'Unknown error')
                    print(f"❌ Task failed: {error}")
                    return False
                    
                elif status == 'running':
                    time.sleep(5)  # Wait 5 seconds before checking again
                    continue
                    
            else:
                print(f"❌ Error checking task status: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error monitoring task: {e}")
            return False
    
    print(f"⏰ Task monitoring timed out after {max_wait} seconds")
    return False


def test_data_clearing():
    """Test data clearing functionality."""
    print("\n🗑️  Testing data clearing...")
    
    try:
        # First check what data exists
        response = requests.get(f"{BASE_URL}/status")
        if response.status_code == 200:
            data = response.json()
            years_with_data = list(data.get('database_stats', {}).keys())
            
            if not years_with_data:
                print("ℹ️  No data to clear")
                return True
            
            # Clear data for the first year found (for testing)
            test_year = int(years_with_data[0])
            print(f"   Clearing data for year: {test_year}")
            
            response = requests.delete(f"{BASE_URL}/data/{test_year}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Data clearing: {result.get('status')}")
                print(f"   Deleted: {result.get('deleted_count', 0)} records")
                return True
            else:
                print(f"❌ Data clearing failed: {response.status_code}")
                return False
        
    except Exception as e:
        print(f"❌ Error testing data clearing: {e}")
        return False


def main():
    """Run all ingestion tests."""
    print("🚀 Transport Data Ingestion Test Suite")
    print("=" * 50)
    
    # Test basic endpoints
    if not test_ingestion_status():
        print("❌ Basic status test failed. Is the server running?")
        return
    
    feeds_data = test_list_feeds()
    if not feeds_data:
        print("❌ Feed listing failed")
        return
    
    # Test ingestion if feeds are available
    gtfs_feeds = feeds_data.get('gtfs_feeds', [])
    
    if gtfs_feeds:
        # Test with first available feed
        first_feed = gtfs_feeds[0]['name']
        print(f"\n🎯 Testing with feed: {first_feed}")
        test_gtfs_ingestion(first_feed)
    else:
        print("\n⚠️  No GTFS feeds available for testing")
        print("   Place a GTFS zip file (e.g., bmtc.zip) in the data directory")
    
    # Test OSM ingestion (this will use sample data if OSM libraries aren't available)
    test_osm_ingestion()
    
    # Test final status
    print("\n📊 Final status check...")
    test_ingestion_status()
    
    print("\n✅ Test suite completed!")


if __name__ == "__main__":
    main()
