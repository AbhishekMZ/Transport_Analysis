"""
API Integration for Orchestration
Integrates the orchestration system with the FastAPI application.
Provides API endpoints for monitoring and managing the orchestration services.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional

from .service_orchestrator import orchestrator
from .scheduler import scheduler
from .logging_config import get_logger
from .tasks import register_scheduled_tasks

logger = get_logger("api")

# Create a router for orchestration-related endpoints
orchestration_router = APIRouter(
    prefix="/orchestration",
    tags=["orchestration"]
)

# Create a router for system health monitoring
monitoring_router = APIRouter(
    prefix="/monitoring",
    tags=["monitoring"]
)

@orchestration_router.get("/status")
async def get_orchestration_status():
    """Get the current status of the service orchestrator"""
    status = orchestrator.get_system_status()
    return status

@orchestration_router.get("/services")
async def list_services():
    """List all registered services"""
    with orchestrator.lock:
        services = {
            service_id: {
                "description": service["description"],
                "status": service["status"],
                "required": service["required"]
            }
            for service_id, service in orchestrator.services.items()
        }
    return services

@orchestration_router.post("/services/{service_id}/restart")
async def restart_service(service_id: str, background_tasks: BackgroundTasks):
    """Restart a specific service"""
    if service_id not in orchestrator.services:
        raise HTTPException(status_code=404, detail=f"Service {service_id} not found")
    
    # Restart service in a background task to avoid blocking the API response
    background_tasks.add_task(orchestrator.restart_service, service_id)
    
    return {
        "message": f"Service {service_id} restart initiated",
        "status": "restarting"
    }

@orchestration_router.get("/tasks")
async def list_tasks():
    """List all scheduled tasks and their status"""
    tasks = scheduler.get_task_status()
    return tasks

@orchestration_router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get detailed status of a specific scheduled task"""
    task = scheduler.get_task_status(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task

@orchestration_router.post("/tasks/{task_id}/run")
async def run_task_manually(task_id: str, background_tasks: BackgroundTasks):
    """Manually trigger a task to run immediately"""
    with scheduler.lock:
        if task_id not in scheduler.tasks:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
        task_info = scheduler.tasks[task_id]
    
    # Run task in a background task
    def run_task_wrapper():
        try:
            logger.info(f"Manually triggered task: {task_id}")
            func = task_info["func"]
            args = task_info["args"]
            kwargs = task_info["kwargs"]
            func(*args, **kwargs)
        except Exception as e:
            logger.exception(f"Error executing manually triggered task {task_id}: {e}")
    
    background_tasks.add_task(run_task_wrapper)
    
    return {
        "message": f"Task {task_id} execution triggered",
        "status": "running"
    }

@orchestration_router.post("/tasks/{task_id}/enable")
async def enable_task(task_id: str):
    """Enable a disabled task"""
    if not scheduler.enable_task(task_id):
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return {"message": f"Task {task_id} enabled"}

@orchestration_router.post("/tasks/{task_id}/disable")
async def disable_task(task_id: str):
    """Disable a task temporarily"""
    if not scheduler.disable_task(task_id):
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return {"message": f"Task {task_id} disabled"}

@monitoring_router.get("/health")
async def system_health_check():
    """Overall system health check endpoint"""
    system_status = orchestrator.get_system_status()
    
    # Check if system is healthy
    if not system_status["healthy"]:
        failed_services = [
            s_id for s_id, s in system_status["services"].items() 
            if s["required"] and (s["status"] != "running" or not s["healthy"])
        ]
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "message": f"Required services are not healthy: {', '.join(failed_services)}",
                "details": system_status
            }
        )
    
    # All healthy
    return {
        "status": "healthy",
        "uptime_seconds": system_status["uptime_seconds"],
        "services_count": len(system_status["services"])
    }

@monitoring_router.get("/logs/recent")
async def get_recent_logs(limit: int = 100, level: str = "INFO"):
    """
    Get recent log entries from memory buffer
    Note: This is a simplified version - a real implementation would 
    need to integrate with the logging system to retrieve logs
    """
    # This is a mock implementation - in a real system, you would retrieve logs from your logging system
    # For example, you might use a database, log aggregation tool, or in-memory buffer
    
    return {
        "message": "Log retrieval not implemented",
        "details": "This endpoint is a placeholder. In a production system, it would integrate with a log storage/retrieval system."
    }

def initialize_orchestration_api(app):
    """Initialize and integrate orchestration with the FastAPI app"""
    # Register API routers
    app.include_router(orchestration_router)
    app.include_router(monitoring_router)
    
    # Set up startup and shutdown events
    @app.on_event("startup")
    async def startup_orchestration():
        from .logging_config import setup_logging
        
        # Configure logging
        setup_logging(log_to_file=True, log_to_json=True)
        logger.info("TransiGenius API starting")
        
        # Initialize orchestrator
        orchestrator.start()
        
        # Register scheduled tasks
        register_scheduled_tasks(scheduler)
        
        logger.info("Orchestration system initialized")
    
    @app.on_event("shutdown")
    async def shutdown_orchestration():
        logger.info("TransiGenius API shutting down")
        
        # Stop orchestrator (which will stop all services)
        orchestrator.stop()
        
        logger.info("Orchestration system stopped")
    
    return app
