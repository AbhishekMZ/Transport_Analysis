"""
Logging Configuration for TransiGenius
Provides standardized logging setup with formatters, handlers, and configuration.
Supports console and file logging with different verbosity levels.
"""

import logging
import sys
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime
from typing import Dict, Optional, Union, List

# Default log directory
DEFAULT_LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
os.makedirs(DEFAULT_LOG_DIR, exist_ok=True)

class TransiGeniusLogger:
    """
    Centralized logger configuration for TransiGenius
    Provides consistent logging across all modules
    """

    # Singleton pattern
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = TransiGeniusLogger()
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.initialized = True
            self.configured_loggers = set()
            self.log_dir = DEFAULT_LOG_DIR
            
            # Create default formatters
            self.formatters = {
                'verbose': logging.Formatter(
                    '%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d): %(message)s'
                ),
                'simple': logging.Formatter(
                    '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
                ),
                'json': logging.Formatter(
                    '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", '
                    '"file": "%(filename)s", "line": %(lineno)d, "message": "%(message)s"}'
                )
            }
            
            # Set up root logger with console handler by default
            self.configure_base_logging()
    
    def configure_base_logging(self):
        """Set up basic logging configuration"""
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        
        # Clear any existing handlers
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(self.formatters['simple'])
        console_handler.setLevel(logging.INFO)
        root_logger.addHandler(console_handler)
        
        # Add the logger to configured list
        self.configured_loggers.add('root')
        
        # Create the TransiGenius logger as a child of the root logger
        self.app_logger = logging.getLogger('transigenius')
        self.app_logger.setLevel(logging.DEBUG)  # Allow all messages to be processed
        
        # We don't add handlers to the app logger directly, as it will use the root logger's handlers
    
    def configure_file_logging(self, 
                             log_file: str = None,
                             max_size_mb: int = 10, 
                             backup_count: int = 5,
                             level: int = logging.DEBUG) -> None:
        """
        Configure file logging for the application
        
        Args:
            log_file: Path to the log file. If None, a default file will be created
            max_size_mb: Maximum size of the log file in MB before rotation
            backup_count: Number of backup files to keep
            level: Logging level for the file handler
        """
        # Generate default log file name if not provided
        if log_file is None:
            today = datetime.now().strftime('%Y-%m-%d')
            log_file = os.path.join(self.log_dir, f'transigenius_{today}.log')
        
        # Create the file handler
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_size_mb * 1024 * 1024,
            backupCount=backup_count
        )
        file_handler.setFormatter(self.formatters['verbose'])
        file_handler.setLevel(level)
        
        # Add to root logger
        root_logger = logging.getLogger()
        root_logger.addHandler(file_handler)
        
        logging.info(f"File logging configured. Log file: {log_file}")
    
    def configure_json_logging(self, log_file: str = None) -> None:
        """
        Configure JSON logging for machine processing
        
        Args:
            log_file: Path to the JSON log file. If None, a default file will be created
        """
        if log_file is None:
            today = datetime.now().strftime('%Y-%m-%d')
            log_file = os.path.join(self.log_dir, f'transigenius_{today}.json.log')
        
        # Create the file handler with JSON formatter
        json_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5
        )
        json_handler.setFormatter(self.formatters['json'])
        json_handler.setLevel(logging.INFO)
        
        # Add to root logger
        root_logger = logging.getLogger()
        root_handler_names = [h.__class__.__name__ for h in root_logger.handlers]
        logging.info(f"Adding JSON handler. Current handlers: {root_handler_names}")
        root_logger.addHandler(json_handler)
    
    def get_logger(self, name: str, level: int = None) -> logging.Logger:
        """
        Get a configured logger for a specific module
        
        Args:
            name: Name of the module/component requesting the logger
            level: Optional specific logging level for this logger
            
        Returns:
            A configured Logger instance
        """
        logger_name = f'transigenius.{name}' if name != 'root' else 'transigenius'
        logger = logging.getLogger(logger_name)
        
        if level is not None:
            logger.setLevel(level)
        
        # Mark as configured
        self.configured_loggers.add(logger_name)
        
        return logger
    
    def set_level(self, level: Union[int, str], logger_name: str = None) -> None:
        """
        Change the logging level for a specific logger or all loggers
        
        Args:
            level: Logging level (can be int like logging.DEBUG or string like 'DEBUG')
            logger_name: Name of the logger to change, or None for all loggers
        """
        # Convert string levels to int if needed
        if isinstance(level, str):
            level = getattr(logging, level.upper())
        
        if logger_name is None:
            # Change level for all configured loggers
            for name in self.configured_loggers:
                logging.getLogger(name).setLevel(level)
        else:
            # Change level for specific logger
            full_name = f'transigenius.{logger_name}' if logger_name != 'root' else 'transigenius'
            logging.getLogger(full_name).setLevel(level)
    
    def log_startup_info(self, app_version: str, config: Dict = None) -> None:
        """
        Log application startup information
        
        Args:
            app_version: Version string of the application
            config: Optional configuration details to log (sensitive info should be masked)
        """
        logger = logging.getLogger('transigenius')
        
        startup_msg = [
            "=" * 50,
            f"TransiGenius API v{app_version} starting up",
            f"Python version: {sys.version}",
            f"Timestamp: {datetime.now().isoformat()}",
            "=" * 50
        ]
        
        for msg in startup_msg:
            logger.info(msg)
        
        if config:
            # Log non-sensitive config details
            safe_config = {k: v for k, v in config.items() 
                          if not any(sens in k.lower() for sens in ['key', 'password', 'token', 'secret'])}
            
            logger.info(f"Configuration: {safe_config}")
    
    def add_api_request_filter(self) -> None:
        """Add a filter to prevent logging every API request (used for FastAPI)"""
        # Silence FastAPI and Uvicorn access logs
        for logger_name in ('uvicorn.access', 'uvicorn', 'fastapi'):
            logging.getLogger(logger_name).setLevel(logging.WARNING)

# Initialize the singleton
logger_manager = TransiGeniusLogger.get_instance()

def setup_logging(
    log_to_file: bool = True,
    log_to_json: bool = False,
    log_level: str = 'INFO',
    log_dir: str = None
) -> None:
    """
    Setup application logging with the requested configuration
    
    Args:
        log_to_file: Whether to log to a rotating file
        log_to_json: Whether to create a JSON formatted log for machine processing
        log_level: Default log level
        log_dir: Directory to store log files
    """
    # Set log directory if specified
    if log_dir:
        logger_manager.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)
    
    # Configure logging to file
    if log_to_file:
        logger_manager.configure_file_logging()
    
    # Configure JSON logging if requested
    if log_to_json:
        logger_manager.configure_json_logging()
    
    # Set the log level
    level = getattr(logging, log_level.upper())
    logger_manager.set_level(level)
    
    # Reduce noise from other libraries
    logger_manager.add_api_request_filter()
    
    # Log startup
    root_logger = logging.getLogger()
    root_logger.info(f"Logging initialized at level {log_level}")

def get_logger(name: str) -> logging.Logger:
    """Get a configured logger for a specific module"""
    return logger_manager.get_logger(name)
