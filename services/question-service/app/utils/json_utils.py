"""JSON utility functions for safe serialization/deserialization"""
import json
import logging
from typing import Any, Optional, List, Dict

logger = logging.getLogger(__name__)


def safe_json_loads(json_str: Optional[str], default: Any = None) -> Any:
    """
    Safely parse JSON string with fallback

    Args:
        json_str: JSON string to parse
        default: Default value if parsing fails

    Returns:
        Parsed JSON data or default value
    """
    if not json_str:
        return default

    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"Failed to parse JSON: {json_str}, error: {e}")
        return default


def safe_json_dumps(data: Any, default: Optional[str] = None) -> Optional[str]:
    """
    Safely serialize data to JSON string

    Args:
        data: Data to serialize
        default: Default value if serialization fails

    Returns:
        JSON string or default value
    """
    if data is None:
        return default

    try:
        return json.dumps(data, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        logger.warning(f"Failed to serialize to JSON: {data}, error: {e}")
        return default


def validate_json_array(data: Any) -> bool:
    """
    Validate that data is a valid JSON array

    Args:
        data: Data to validate

    Returns:
        True if valid JSON array, False otherwise
    """
    if isinstance(data, list):
        return True

    if isinstance(data, str):
        try:
            parsed = json.loads(data)
            return isinstance(parsed, list)
        except json.JSONDecodeError:
            return False

    return False


def ensure_json_array(data: Any) -> List:
    """
    Ensure data is returned as a list

    Args:
        data: Data to convert to list

    Returns:
        List representation of data
    """
    if isinstance(data, list):
        return data

    if isinstance(data, str):
        parsed = safe_json_loads(data, [])
        return parsed if isinstance(parsed, list) else []

    return []