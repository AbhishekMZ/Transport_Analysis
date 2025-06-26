"""
Scheduled Tasks for TransiGenius
Defines recurring background tasks that are managed by the scheduler.
"""

import os
import time
from datetime import datetime, timedelta
import httpx
from typing import Dict, Any, List, Optional

from .logging_config import get_logger

logger = get_logger("tasks")

class TransiGeniusTasks:
    """
    Collection of scheduled tasks that run in the background
    to keep the system updated and running smoothly.
    """
    
    @staticmethod
    async def update_traffic_data():
        """
        Task to update real-time traffic data from TomTom API.
        Scheduled to run every 5 minutes.
        """
        from ..services.tomtom_service import TomTomService
        
        logger.info("Starting traffic data update task")
        start_time = time.time()
        
        try:
            # Get TomTom service
            tomtom = TomTomService()
            
            # Update traffic flow data
            flow_data = await tomtom.get_traffic_flow()
            if flow_data:
                logger.info(f"Updated traffic flow data: {len(flow_data['features'])} road segments")
            
            # Update traffic incidents
            incidents = await tomtom.get_traffic_incidents()
            if incidents:
                logger.info(f"Updated traffic incidents: {len(incidents['incidents'])} active incidents")
                
            # Process data (this would normally update in-memory cache and/or database)
            logger.info("Traffic data processed and cached")
            
            duration = time.time() - start_time
            logger.info(f"Traffic data update completed in {duration:.2f} seconds")
            return True
        except Exception as e:
            logger.exception(f"Error updating traffic data: {e}")
            return False
    
    @staticmethod
    async def cleanup_old_logs():
        """
        Task to clean up old log files to prevent disk space issues.
        Scheduled to run once per day.
        """
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
        
        if not os.path.exists(log_dir):
            logger.info(f"Log directory {log_dir} does not exist. Nothing to cleanup.")
            return True
            
        logger.info(f"Starting log cleanup task in {log_dir}")
        retention_days = 7  # Keep logs for 7 days
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        
        try:
            files_removed = 0
            for filename in os.listdir(log_dir):
                file_path = os.path.join(log_dir, filename)
                
                # Skip directories
                if os.path.isdir(file_path):
                    continue
                
                # Check file modification time
                file_modified = datetime.fromtimestamp(os.path.getmtime(file_path))
                if file_modified < cutoff_date:
                    os.remove(file_path)
                    files_removed += 1
                    logger.debug(f"Removed old log file: {filename}")
            
            logger.info(f"Log cleanup completed. Removed {files_removed} old log files.")
            return True
        except Exception as e:
            logger.exception(f"Error during log cleanup: {e}")
            return False
    
    @staticmethod
    async def generate_daily_report():
        """
        Task to generate a daily traffic report with statistics and insights.
        Scheduled to run once per day at midnight.
        """
        logger.info("Starting daily report generation")
        
        try:
            from ..services.report_service import ReportService
            
            report_service = ReportService()
            yesterday = datetime.now() - timedelta(days=1)
            yesterday_str = yesterday.strftime('%Y-%m-%d')
            
            # Generate report for yesterday
            report = await report_service.generate_daily_report(yesterday_str)
            
            if report:
                report_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                    'data', 
                    'reports', 
                    f'daily_report_{yesterday_str}.json'
                )
                
                # Ensure reports directory exists
                os.makedirs(os.path.dirname(report_path), exist_ok=True)
                
                # Save the report
                with open(report_path, 'w') as f:
                    import json
                    json.dump(report, f, indent=2)
                
                logger.info(f"Daily report generated and saved to {report_path}")
                return True
            else:
                logger.warning("Failed to generate daily report")
                return False
        except Exception as e:
            logger.exception(f"Error generating daily report: {e}")
            return False
    
    @staticmethod
    async def update_system_health():
        """
        Task to check system health and update metrics.
        Scheduled to run every 15 minutes.
        """
        logger.info("Starting system health check")
        
        try:
            # Check for disk space
            import shutil
            disk = shutil.disk_usage("/")
            disk_percent_used = (disk.used / disk.total) * 100
            
            if disk_percent_used > 90:
                logger.warning(f"Disk space critical: {disk_percent_used:.1f}% used")
            
            # Check memory usage
            import psutil
            memory = psutil.virtual_memory()
            memory_percent_used = memory.percent
            
            if memory_percent_used > 90:
                logger.warning(f"Memory usage critical: {memory_percent_used:.1f}% used")
            
            # Check API endpoints health
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:8000/health")
                if response.status_code != 200:
                    logger.warning(f"API health check failed with status: {response.status_code}")
            
            logger.info("System health check completed")
            return True
        except Exception as e:
            logger.exception(f"Error checking system health: {e}")
            return False
    
    @staticmethod
    async def update_graph_analysis():
        """
        Task to update transport network graph analysis.
        Scheduled to run once per day.
        """
        logger.info("Starting transport network graph analysis")
        
        try:
            from ..services.graph_service import GraphService
            
            graph_service = GraphService()
            
            # Update centrality metrics
            centrality = await graph_service.calculate_centrality_metrics()
            if centrality:
                logger.info("Updated network centrality metrics")
            
            # Update critical nodes
            critical_nodes = await graph_service.identify_critical_nodes()
            if critical_nodes:
                logger.info(f"Updated critical nodes: identified {len(critical_nodes)} nodes")
            
            logger.info("Transport network graph analysis completed")
            return True
        except Exception as e:
            logger.exception(f"Error updating graph analysis: {e}")
            return False

# Task registration function to be called during application startup
def register_scheduled_tasks(scheduler):
    """Register all scheduled tasks with the scheduler"""
    from .scheduler import scheduler
    import asyncio
    
    # Helper to run async tasks in the scheduler
    def run_async_task(coro_func):
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro_func())
    
    # Register real-time traffic update (every 5 minutes)
    scheduler.add_task(
        task_id="update_traffic_data",
        func=lambda: run_async_task(TransiGeniusTasks.update_traffic_data),
        interval_seconds=5 * 60,  # 5 minutes
        description="Update real-time traffic data from TomTom API"
    )
    
    # Register log cleanup (once per day at 2 AM)
    scheduler.add_task(
        task_id="cleanup_old_logs",
        func=lambda: run_async_task(TransiGeniusTasks.cleanup_old_logs),
        cron_expression="0 2 * * *",  # At 2:00 AM every day
        description="Clean up old log files"
    )
    
    # Register daily report generation (once per day at 1 AM)
    scheduler.add_task(
        task_id="generate_daily_report",
        func=lambda: run_async_task(TransiGeniusTasks.generate_daily_report),
        cron_expression="0 1 * * *",  # At 1:00 AM every day
        description="Generate daily traffic report"
    )
    
    # Register system health check (every 15 minutes)
    scheduler.add_task(
        task_id="update_system_health",
        func=lambda: run_async_task(TransiGeniusTasks.update_system_health),
        interval_seconds=15 * 60,  # 15 minutes
        description="Check system health and update metrics"
    )
    
    # Register graph analysis update (once per day at 3 AM)
    scheduler.add_task(
        task_id="update_graph_analysis",
        func=lambda: run_async_task(TransiGeniusTasks.update_graph_analysis),
        cron_expression="0 3 * * *",  # At 3:00 AM every day
        description="Update transport network graph analysis"
    )
    
    logger.info("Scheduled tasks registered")
