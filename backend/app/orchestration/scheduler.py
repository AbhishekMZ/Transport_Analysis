"""
Task Scheduler for TransiGenius
Handles scheduling and execution of recurring tasks like data updates,
traffic processing, and system maintenance.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Callable, Optional, Union, Any
import threading
from functools import partial
import signal
import sys

# Configure logger for the scheduler
logger = logging.getLogger("transigenius.scheduler")

class TaskScheduler:
    """
    A scheduler for managing and executing recurring tasks in TransiGenius.
    Support for both interval-based and cron-like scheduled tasks.
    """
    
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.running = False
        self.lock = threading.RLock()
        self.task_runs: Dict[str, Dict] = {}  # Track task execution history
        
    def add_task(self, 
                task_id: str, 
                func: Callable, 
                interval_seconds: Optional[int] = None,
                cron_expression: Optional[str] = None,
                args: List = None, 
                kwargs: Dict = None,
                description: str = "") -> None:
        """
        Add a new task to the scheduler.
        
        Args:
            task_id: Unique identifier for the task
            func: Function to execute
            interval_seconds: Interval in seconds between executions (mutually exclusive with cron_expression)
            cron_expression: Cron-like expression for scheduling (e.g., "0 */3 * * *" for every 3 hours)
            args: Positional arguments for the function
            kwargs: Keyword arguments for the function
            description: Human-readable description of the task
        """
        if task_id in self.tasks:
            logger.warning(f"Task {task_id} already exists. Overwriting.")
            
        if interval_seconds is None and cron_expression is None:
            raise ValueError("Either interval_seconds or cron_expression must be provided")
            
        if interval_seconds is not None and cron_expression is not None:
            raise ValueError("Only one of interval_seconds or cron_expression should be provided")
        
        with self.lock:
            self.tasks[task_id] = {
                "func": func,
                "interval": interval_seconds,
                "cron": cron_expression,
                "args": args or [],
                "kwargs": kwargs or {},
                "last_run": None,
                "next_run": self._calculate_next_run(interval_seconds, cron_expression),
                "description": description,
                "enabled": True,
                "error_count": 0
            }
            
        logger.info(f"Added task: {task_id} - {description}")
        
    def _calculate_next_run(self, 
                           interval_seconds: Optional[int] = None, 
                           cron_expression: Optional[str] = None) -> datetime:
        """Calculate the next run time based on interval or cron expression"""
        now = datetime.now()
        
        if interval_seconds:
            return now + timedelta(seconds=interval_seconds)
        elif cron_expression:
            # Simple cron implementation for common patterns
            # In a production system, use a full cron parser like croniter
            parts = cron_expression.split()
            if len(parts) != 5:
                raise ValueError(f"Invalid cron expression: {cron_expression}")
                
            # For this simplified version, we'll just handle hourly jobs
            # For example "0 */3 * * *" runs at minute 0 every 3 hours
            if parts[0] == "0" and parts[1].startswith("*/"):
                try:
                    hours = int(parts[1][2:])
                    next_hour = ((now.hour // hours) + 1) * hours
                    if next_hour >= 24:
                        next_hour = 0
                        # Add a day
                        return datetime(now.year, now.month, now.day, next_hour, 0) + timedelta(days=1)
                    return datetime(now.year, now.month, now.day, next_hour, 0)
                except ValueError:
                    pass
                    
            # Default to 1 hour from now if we can't parse the cron expression
            logger.warning(f"Complex cron expression not fully supported: {cron_expression}. Defaulting to 1 hour interval.")
            return now + timedelta(hours=1)
        
        return now  # Fallback
    
    def remove_task(self, task_id: str) -> bool:
        """Remove a task from the scheduler"""
        with self.lock:
            if task_id in self.tasks:
                del self.tasks[task_id]
                logger.info(f"Removed task: {task_id}")
                return True
            return False
    
    def enable_task(self, task_id: str) -> bool:
        """Enable a disabled task"""
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id]["enabled"] = True
                logger.info(f"Enabled task: {task_id}")
                return True
            return False
    
    def disable_task(self, task_id: str) -> bool:
        """Disable a task temporarily"""
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id]["enabled"] = False
                logger.info(f"Disabled task: {task_id}")
                return True
            return False
    
    def start(self) -> None:
        """Start the scheduler to execute tasks based on their schedules"""
        if self.running:
            logger.warning("Scheduler is already running")
            return
            
        logger.info("Starting TransiGenius task scheduler")
        self.running = True
        
        # Set up signal handling for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        
        # Create a thread for the scheduler
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.scheduler_thread.start()
    
    def _handle_shutdown(self, signum, frame):
        """Handle shutdown signals gracefully"""
        logger.info("Shutdown signal received, stopping scheduler...")
        self.stop()
        sys.exit(0)
    
    def stop(self) -> None:
        """Stop the scheduler"""
        logger.info("Stopping scheduler...")
        self.running = False
        if hasattr(self, 'scheduler_thread'):
            self.scheduler_thread.join(timeout=5.0)  # Wait up to 5 seconds
        logger.info("Scheduler stopped")
    
    def _scheduler_loop(self) -> None:
        """Main scheduler loop that checks and executes due tasks"""
        while self.running:
            now = datetime.now()
            
            with self.lock:
                # Find tasks that need to be executed
                due_tasks = [(task_id, task_info) for task_id, task_info in self.tasks.items()
                             if task_info["enabled"] and task_info["next_run"] <= now]
            
            # Execute due tasks in separate threads
            for task_id, task_info in due_tasks:
                self._execute_task(task_id, task_info)
                
            # Sleep for a short interval before checking again
            time.sleep(1)
    
    def _execute_task(self, task_id: str, task_info: Dict) -> None:
        """Execute a task and update its schedule"""
        # Create a thread for task execution
        execute_thread = threading.Thread(
            target=self._task_wrapper,
            args=(task_id, task_info)
        )
        execute_thread.daemon = True
        execute_thread.start()
        
        # Update task's next run time
        with self.lock:
            if task_id in self.tasks:  # Check if task still exists
                if task_info["interval"]:
                    self.tasks[task_id]["next_run"] = datetime.now() + timedelta(seconds=task_info["interval"])
                else:  # cron
                    self.tasks[task_id]["next_run"] = self._calculate_next_run(None, task_info["cron"])
                
                self.tasks[task_id]["last_run"] = datetime.now()
    
    def _task_wrapper(self, task_id: str, task_info: Dict) -> None:
        """Wrapper around task execution for error handling and logging"""
        start_time = time.time()
        success = False
        error = None
        
        try:
            logger.info(f"Executing task: {task_id} - {task_info['description']}")
            task_info["func"](*task_info["args"], **task_info["kwargs"])
            success = True
        except Exception as e:
            error = str(e)
            with self.lock:
                if task_id in self.tasks:
                    self.tasks[task_id]["error_count"] += 1
            logger.exception(f"Error executing task {task_id}: {e}")
        finally:
            duration = time.time() - start_time
            
            # Record execution in history
            with self.lock:
                if task_id not in self.task_runs:
                    self.task_runs[task_id] = []
                
                # Limit history size to avoid memory issues
                if len(self.task_runs[task_id]) >= 100:
                    self.task_runs[task_id].pop(0)
                
                self.task_runs[task_id].append({
                    "timestamp": datetime.now(),
                    "duration": duration,
                    "success": success,
                    "error": error
                })
            
            logger.info(f"Task {task_id} completed in {duration:.2f}s (success: {success})")
    
    def get_task_status(self, task_id: str = None) -> Dict:
        """Get the status of tasks in the scheduler"""
        with self.lock:
            if task_id:
                if task_id in self.tasks:
                    task = self.tasks[task_id].copy()
                    # Add execution history
                    task["execution_history"] = self.task_runs.get(task_id, [])[-10:]  # Last 10 runs
                    return task
                return None
            
            # Return all tasks status
            return {
                tid: {
                    "description": t["description"],
                    "enabled": t["enabled"],
                    "last_run": t["last_run"],
                    "next_run": t["next_run"],
                    "error_count": t["error_count"]
                }
                for tid, t in self.tasks.items()
            }

# Singleton instance for global use
scheduler = TaskScheduler()

def initialize_scheduler():
    """Initialize and start the scheduler with system tasks"""
    scheduler.start()
    return scheduler
