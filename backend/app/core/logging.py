"""
Logging configuration module for the application
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(
    app_name: str = "moon-guide-ai", log_level: str = "INFO"
) -> logging.Logger:
    """
    Setup logging configuration with console and file handlers

    Args:
        app_name: Name of the application for logging
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(app_name)
    logger.setLevel(getattr(logging, log_level))

    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Log format
    log_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level))
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)

    # File handler with rotation (skipped if log directory is not writable)
    try:
        file_handler = RotatingFileHandler(
            log_dir / f"{app_name}.log", maxBytes=10_485_760, backupCount=5  # 10MB
        )
        file_handler.setLevel(getattr(logging, log_level))
        file_handler.setFormatter(log_format)
        logger.addHandler(file_handler)
    except (PermissionError, OSError):
        pass

    return logger


# Get the default logger for the app
logger = setup_logging()
