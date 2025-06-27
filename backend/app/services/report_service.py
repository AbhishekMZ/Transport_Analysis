"""
Report Service for generating and managing analysis reports
"""
import json
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

from ..services.analysis_service import AnalysisService
from ..services.tomtom_service import TomTomService
from ..services.local_data_service import LocalDataService
from ..core.config import get_settings

settings = get_settings()


class ReportService:
    """Service for generating and managing reports"""
    
    def __init__(self):
        self.analysis_service = AnalysisService()
        self.tomtom_service = TomTomService()
        self.data_service = LocalDataService()
        self.reports_dir = Path("data/reports")
        self.reports_dir.mkdir(parents=True, exist_ok=True)
    
    async def get_reports(self, report_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get list of available reports
        """
        reports = []
        
        try:
            for report_file in self.reports_dir.glob("*.json"):
                try:
                    with open(report_file, 'r') as f:
                        report_data = json.load(f)
                    
                    # Extract metadata
                    report_info = {
                        "id": report_data.get("id", str(uuid.uuid4())),
                        "title": report_data.get("title", report_file.stem),
                        "description": report_data.get("description", "Generated report"),
                        "type": report_data.get("type", "analysis"),
                        "created_date": report_data.get("created_date", ""),
                        "size": f"{os.path.getsize(report_file) / (1024*1024):.1f} MB",
                        "tags": report_data.get("tags", []),
                        "file_path": str(report_file)
                    }
                    
                    if not report_type or report_type.lower() in report_info["type"].lower():
                        reports.append(report_info)
                        
                except Exception as e:
                    print(f"Error reading report {report_file}: {e}")
                    continue
                    
        except Exception as e:
            print(f"Error accessing reports directory: {e}")
        
        return sorted(reports, key=lambda x: x.get("created_date", ""), reverse=True)
    
    async def generate_report(self, report_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a new report based on parameters
        """
        report_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        try:
            report_data = {
                "id": report_id,
                "title": report_params.get("title", f"Report {timestamp}"),
                "description": report_params.get("description", ""),
                "type": report_params.get("type", "analysis"),
                "created_date": timestamp,
                "parameters": report_params,
                "data": {},
                "tags": []
            }
            
            # Generate report content based on type
            report_type = report_params.get("type", "analysis")
            
            if report_type == "traffic":
                report_data["data"] = await self._generate_traffic_report(report_params)
                report_data["tags"] = ["traffic", "real-time"]
                
            elif report_type == "network":
                report_data["data"] = await self._generate_network_report(report_params)
                report_data["tags"] = ["network", "analysis", "graph"]
                
            elif report_type == "forecast":
                report_data["data"] = await self._generate_forecast_report(report_params)
                report_data["tags"] = ["forecast", "ml", "prediction"]
                
            elif report_type == "static-map":
                report_data["data"] = await self._generate_static_map_report(report_params)
                report_data["tags"] = ["map", "visualization"]
                
            else:
                # Default comprehensive report
                report_data["data"] = await self._generate_comprehensive_report(report_params)
                report_data["tags"] = ["comprehensive", "analysis"]
            
            # Save report to file
            file_path = self.reports_dir / f"report_{report_id}.json"
            with open(file_path, 'w') as f:
                json.dump(report_data, f, indent=2, default=str)
            
            return {
                "success": True,
                "report_id": report_id,
                "message": "Report generated successfully",
                "file_path": str(file_path)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate report: {str(e)}"
            }
    
    async def _generate_traffic_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate traffic analysis report"""
        try:
            # Get real-time traffic data
            traffic_flow = await self.tomtom_service.get_traffic_flow()
            incidents = await self.tomtom_service.get_traffic_incidents()
            
            # Calculate statistics
            avg_speed = 0
            total_segments = 0
            congestion_areas = 0
            
            if traffic_flow and "flowSegmentData" in traffic_flow.get("results", [{}])[0]:
                segments = traffic_flow["results"][0]["flowSegmentData"]
                for segment in segments:
                    if "currentSpeed" in segment:
                        avg_speed += segment["currentSpeed"]
                        total_segments += 1
                        if segment.get("currentSpeed", 0) < segment.get("freeFlowSpeed", 0) * 0.7:
                            congestion_areas += 1
            
            avg_speed = avg_speed / total_segments if total_segments > 0 else 0
            
            return {
                "summary": {
                    "average_speed": round(avg_speed, 2),
                    "total_incidents": len(incidents.get("incidents", [])),
                    "congestion_areas": congestion_areas,
                    "data_timestamp": datetime.now().isoformat()
                },
                "traffic_flow": traffic_flow,
                "incidents": incidents
            }
            
        except Exception as e:
            return {"error": f"Failed to generate traffic report: {str(e)}"}
    
    async def _generate_network_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate network analysis report"""
        try:
            # Get critical nodes analysis
            critical_nodes = await self.analysis_service.get_critical_nodes(
                layer=params.get("layer", "road_network"),
                algorithm=params.get("algorithm", "betweenness_centrality"),
                count=params.get("count", 10)
            )
            
            return {
                "critical_nodes": critical_nodes,
                "analysis_parameters": params,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Failed to generate network report: {str(e)}"}
    
    async def _generate_forecast_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate ML forecast report"""
        try:
            # Get traffic forecast
            forecast = await self.analysis_service.get_traffic_forecast(
                datetime=params.get("datetime"),
                area=params.get("area")
            )
            
            return {
                "forecast": forecast,
                "parameters": params,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Failed to generate forecast report: {str(e)}"}
    
    async def _generate_static_map_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate static map report"""
        try:
            # This would integrate with Google Maps Static API
            # For now, return placeholder data
            return {
                "map_url": f"https://maps.googleapis.com/maps/api/staticmap?center=12.9716,77.5946&zoom=12&size=800x600&key={settings.GOOGLE_MAPS_API_KEY}",
                "parameters": params,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Failed to generate static map report: {str(e)}"}
    
    async def _generate_comprehensive_report(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive analysis report"""
        try:
            # Combine multiple data sources
            report_data = {}
            
            # Get traffic data
            if params.get("include_traffic", True):
                report_data["traffic"] = await self._generate_traffic_report(params)
            
            # Get network analysis
            if params.get("include_network", True):
                report_data["network"] = await self._generate_network_report(params)
            
            # Get forecast if requested
            if params.get("include_forecast", False):
                report_data["forecast"] = await self._generate_forecast_report(params)
            
            return report_data
            
        except Exception as e:
            return {"error": f"Failed to generate comprehensive report: {str(e)}"}
    
    async def generate_daily_report(self, date_str: str) -> Optional[Dict[str, Any]]:
        """
        Generate daily report for a specific date
        """
        try:
            report_params = {
                "title": f"Daily Traffic Report - {date_str}",
                "description": f"Comprehensive daily analysis for {date_str}",
                "type": "daily",
                "date": date_str,
                "include_traffic": True,
                "include_network": True,
                "include_forecast": False
            }
            
            result = await self.generate_report(report_params)
            
            if result.get("success"):
                return result
            else:
                return None
                
        except Exception as e:
            print(f"Error generating daily report: {e}")
            return None
    
    async def get_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific report by ID"""
        try:
            file_path = self.reports_dir / f"report_{report_id}.json"
            if file_path.exists():
                with open(file_path, 'r') as f:
                    return json.load(f)
            return None
        except Exception as e:
            print(f"Error reading report {report_id}: {e}")
            return None
    
    async def delete_report(self, report_id: str) -> bool:
        """Delete a report by ID"""
        try:
            file_path = self.reports_dir / f"report_{report_id}.json"
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting report {report_id}: {e}")
            return False
