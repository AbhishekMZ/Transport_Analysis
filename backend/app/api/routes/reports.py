"""
Reports API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

from ...services.report_service import ReportService

router = APIRouter()


class ReportGenerationRequest(BaseModel):
    """Request model for report generation"""
    title: str = Field(..., description="Report title")
    description: str = Field("", description="Report description")
    type: str = Field("analysis", description="Report type")
    data_source: str = Field("historical", description="Data source")
    date_range: str = Field("last-week", description="Date range")
    format: str = Field("json", description="Output format")
    template: str = Field("standard", description="Report template")
    area: Optional[str] = Field(None, description="Area of interest")
    include_traffic: bool = Field(True, description="Include traffic data")
    include_network: bool = Field(True, description="Include network analysis")
    include_forecast: bool = Field(False, description="Include forecast data")


class ReportResponse(BaseModel):
    """Response model for report data"""
    id: str
    title: str
    description: str
    type: str
    created_date: str
    size: str
    tags: List[str]
    file_path: Optional[str] = None


@router.get("/", response_model=List[ReportResponse])
async def get_reports(
    report_type: Optional[str] = None
):
    """
    Get list of available reports
    """
    try:
        report_service = ReportService()
        reports = await report_service.get_reports(report_type)
        
        return [
            ReportResponse(
                id=report["id"],
                title=report["title"],
                description=report["description"],
                type=report["type"],
                created_date=report["created_date"],
                size=report["size"],
                tags=report["tags"]
            )
            for report in reports
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get reports: {str(e)}")


@router.post("/generate")
async def generate_report(request: ReportGenerationRequest):
    """
    Generate a new report
    """
    try:
        report_service = ReportService()
        
        # Convert request to parameters dict
        params = {
            "title": request.title,
            "description": request.description,
            "type": request.type,
            "data_source": request.data_source,
            "date_range": request.date_range,
            "format": request.format,
            "template": request.template,
            "area": request.area,
            "include_traffic": request.include_traffic,
            "include_network": request.include_network,
            "include_forecast": request.include_forecast
        }
        
        result = await report_service.generate_report(params)
        
        if result.get("success"):
            return {
                "success": True,
                "report_id": result["report_id"],
                "message": result["message"]
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/{report_id}")
async def get_report(report_id: str):
    """
    Get a specific report by ID
    """
    try:
        report_service = ReportService()
        report = await report_service.get_report_by_id(report_id)
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get report: {str(e)}")


@router.delete("/{report_id}")
async def delete_report(report_id: str):
    """
    Delete a report by ID
    """
    try:
        report_service = ReportService()
        success = await report_service.delete_report(report_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {"success": True, "message": "Report deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")


@router.get("/types/available")
async def get_report_types():
    """
    Get available report types
    """
    return {
        "types": [
            {"value": "traffic", "label": "Traffic Analysis", "description": "Real-time traffic flow and incident analysis"},
            {"value": "network", "label": "Network Analysis", "description": "Graph-based network structure analysis"},
            {"value": "forecast", "label": "ML Forecast", "description": "Machine learning traffic predictions"},
            {"value": "static-map", "label": "Static Map", "description": "Static map visualizations"},
            {"value": "comprehensive", "label": "Comprehensive", "description": "Combined multi-source analysis"}
        ]
    }


@router.get("/templates/available")
async def get_report_templates():
    """
    Get available report templates
    """
    return {
        "templates": [
            {"value": "standard", "label": "Standard Report", "description": "Standard comprehensive format"},
            {"value": "executive", "label": "Executive Summary", "description": "High-level summary for executives"},
            {"value": "technical", "label": "Technical Details", "description": "Detailed technical analysis"},
            {"value": "comparison", "label": "Comparative Analysis", "description": "Comparative data analysis"}
        ]
    }
