"""
Service Orchestrator for TransiGenius
Manages service lifecycles, coordinates between different components,
and provides a unified interface for system operations.
"""

import asyncio
import os
import signal
import sys
import time
from typing import Dict, List, Any, Callable, Optional, Set
import threading
from datetime import datetime, timedelta
import logging
import traceback

from .logging_config import get_logger
from .scheduler import scheduler

logger = get_logger("orchestrator")

class ServiceOrchestrator:
    """
    Central orchestrator that manages and coordinates all backend services.
    Handles startup, shutdown, health monitoring, and inter-service communication.
    """
    
    def __init__(self):
        self.services: Dict[str, Dict[str, Any]] = {}
        self.running = False
        self.lock = threading.RLock()
        self.health_check_interval = 60  # seconds
        self.startup_timestamp = datetime.now()
        self.status = "initializing"
        self.service_dependencies: Dict[str, List[str]] = {}
        
    def register_service(self, 
                        service_id: str, 
                        startup_func: Callable, 
                        shutdown_func: Callable = None,
                        health_check_func: Callable = None,
                        dependencies: List[str] = None,
                        required: bool = True,
                        description: str = "") -> None:
        """
        Register a service with the orchestrator
        
        Args:
            service_id: Unique identifier for the service
            startup_func: Function to call when starting the service
            shutdown_func: Function to call when shutting down the service
            health_check_func: Function that returns a boolean indicating service health
            dependencies: List of service IDs that this service depends on
            required: Whether this service is required for the system to operate
            description: Human-readable description of the service
        """
        with self.lock:
            if service_id in self.services:
                logger.warning(f"Service {service_id} already registered. Overwriting.")
                
            self.services[service_id] = {
                "startup_func": startup_func,
                "shutdown_func": shutdown_func,
                "health_check_func": health_check_func,
                "dependencies": dependencies or [],
                "required": required,
                "description": description,
                "status": "registered",  # registered, starting, running, error, stopped
                "last_health_check": None,
                "healthy": None,
                "error": None
            }
            
            # Store dependencies
            if dependencies:
                self.service_dependencies[service_id] = dependencies
                
            logger.info(f"Registered service: {service_id} - {description}")
    
    def start(self) -> None:
        """Start all registered services in dependency order"""
        if self.running:
            logger.warning("Orchestrator is already running")
            return
            
        logger.info("Starting TransiGenius Service Orchestrator")
        self.running = True
        self.status = "starting"
        
        # Set up signal handling for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        
        # Start services in dependency order
        startup_order = self._calculate_startup_order()
        logger.info(f"Service startup order: {startup_order}")
        
        for service_id in startup_order:
            self._start_service(service_id)
        
        # Start background monitoring thread
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        
        self.status = "running"
        logger.info("Service Orchestrator is running")
    
    def _start_service(self, service_id: str) -> bool:
        """Start a specific service"""
        if service_id not in self.services:
            logger.warning(f"Attempted to start unknown service: {service_id}")
            return False
            
        service = self.services[service_id]
        
        # Check if dependencies are running
        for dep_id in service["dependencies"]:
            if dep_id not in self.services or self.services[dep_id]["status"] != "running":
                logger.error(f"Cannot start {service_id}: dependency {dep_id} not running")
                service["status"] = "error"
                service["error"] = f"Dependency {dep_id} not running"
                return False
        
        try:
            logger.info(f"Starting service: {service_id}")
            service["status"] = "starting"
            
            # Call the startup function
            result = service["startup_func"]()
            
            # Update service status
            service["status"] = "running"
            service["last_health_check"] = datetime.now()
            service["healthy"] = True
            
            logger.info(f"Service {service_id} started successfully")
            return True
        except Exception as e:
            logger.exception(f"Error starting service {service_id}: {str(e)}")
            service["status"] = "error"
            service["error"] = str(e)
            
            # Check if this is a required service
            if service["required"]:
                logger.critical(f"Required service {service_id} failed to start. System cannot operate properly.")
            
            return False
    
    def stop(self) -> None:
        """Stop all services in reverse dependency order"""
        if not self.running:
            logger.warning("Orchestrator is not running")
            return
            
        logger.info("Stopping Service Orchestrator and all services...")
        self.running = False
        self.status = "stopping"
        
        # Get services in reverse dependency order
        shutdown_order = list(reversed(self._calculate_startup_order()))
        logger.info(f"Service shutdown order: {shutdown_order}")
        
        # Stop each service
        for service_id in shutdown_order:
            self._stop_service(service_id)
        
        logger.info("All services stopped")
        self.status = "stopped"
    
    def _stop_service(self, service_id: str) -> bool:
        """Stop a specific service"""
        if service_id not in self.services:
            return False
            
        service = self.services[service_id]
        
        try:
            logger.info(f"Stopping service: {service_id}")
            
            if service["shutdown_func"] and service["status"] in ("running", "error"):
                service["shutdown_func"]()
                
            service["status"] = "stopped"
            logger.info(f"Service {service_id} stopped")
            return True
        except Exception as e:
            logger.exception(f"Error stopping service {service_id}: {str(e)}")
            service["error"] = str(e)
            return False
    
    def _handle_shutdown(self, signum, frame):
        """Handle shutdown signals gracefully"""
        logger.info(f"Shutdown signal {signum} received, stopping all services...")
        self.stop()
        sys.exit(0)
    
    def _monitoring_loop(self) -> None:
        """Background thread that monitors service health"""
        logger.info("Service monitoring started")
        
        while self.running:
            time.sleep(self.health_check_interval)
            
            if not self.running:
                break
                
            try:
                self._check_services_health()
            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}")
    
    def _check_services_health(self) -> None:
        """Check the health of all running services"""
        with self.lock:
            for service_id, service in self.services.items():
                if service["status"] != "running":
                    continue
                    
                if service["health_check_func"]:
                    try:
                        healthy = service["health_check_func"]()
                        service["healthy"] = healthy
                        service["last_health_check"] = datetime.now()
                        
                        if not healthy:
                            logger.warning(f"Service {service_id} health check failed")
                            
                            # Handle unhealthy required services
                            if service["required"]:
                                logger.error(f"Critical service {service_id} is unhealthy!")
                                # Here we could implement recovery logic
                    except Exception as e:
                        logger.exception(f"Error checking health of {service_id}: {str(e)}")
                        service["healthy"] = False
    
    def restart_service(self, service_id: str) -> bool:
        """Restart a specific service"""
        if service_id not in self.services:
            return False
            
        logger.info(f"Restarting service: {service_id}")
        
        # Stop service first
        success = self._stop_service(service_id)
        if not success:
            logger.warning(f"Failed to stop service {service_id} cleanly")
            
        # Attempt to start regardless
        return self._start_service(service_id)
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get the current status of all services and the system overall"""
        with self.lock:
            # Calculate system health
            services_status = {
                service_id: {
                    "status": service["status"],
                    "healthy": service["healthy"],
                    "last_health_check": service["last_health_check"],
                    "error": service["error"],
                    "description": service["description"],
                    "required": service["required"]
                }
                for service_id, service in self.services.items()
            }
            
            # System is healthy if all required services are running and healthy
            required_services = [s for s_id, s in self.services.items() if s["required"]]
            required_healthy = all(s["status"] == "running" and s["healthy"] for s in required_services)
            
            return {
                "status": self.status,
                "healthy": required_healthy,
                "services": services_status,
                "uptime_seconds": (datetime.now() - self.startup_timestamp).total_seconds(),
                "last_updated": datetime.now().isoformat()
            }
    
    def _calculate_startup_order(self) -> List[str]:
        """
        Calculate the order in which services should be started based on dependencies.
        Uses a topological sort algorithm.
        """
        # Create a dependency graph
        graph = {s_id: set(self.services[s_id]["dependencies"]) for s_id in self.services}
        
        # Find all nodes with no incoming edges
        no_incoming_edges = set()
        incoming_edges = set()
        
        for node, edges in graph.items():
            incoming_edges.update(edges)
            
        for node in graph:
            if node not in incoming_edges:
                no_incoming_edges.add(node)
        
        # Main topological sort algorithm
        sorted_order = []
        
        while no_incoming_edges:
            # Remove a node with no incoming edges
            node = no_incoming_edges.pop()
            sorted_order.append(node)
            
            # Remove outgoing edges and check for new nodes with no incoming edges
            for m in list(graph.keys()):
                if node in graph[m]:
                    graph[m].remove(node)
                    if not graph[m]:
                        no_incoming_edges.add(m)
        
        # Check for cycles
        if any(graph.values()):
            remaining = [n for n, edges in graph.items() if edges]
            logger.error(f"Service dependency cycle detected among: {remaining}")
            
        return sorted_order

# Create a singleton instance
orchestrator = ServiceOrchestrator()

def initialize_orchestration():
    """Initialize the service orchestrator and register core services"""
    from .scheduler import initialize_scheduler
    
    # Register the scheduler service
    orchestrator.register_service(
        service_id="scheduler",
        startup_func=initialize_scheduler,
        shutdown_func=lambda: scheduler.stop(),
        health_check_func=lambda: True,  # Simple check - could be more sophisticated
        required=True,
        description="Task scheduler for recurring system tasks"
    )
    
    # Start the orchestrator
    orchestrator.start()
    
    return orchestrator
