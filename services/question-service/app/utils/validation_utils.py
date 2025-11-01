"""Validation utilities for question data"""
import re
from typing import List, Optional
from urllib.parse import urlparse


def validate_image_urls(urls: List[str]) -> List[str]:
    """
    Validate and filter image URLs

    Args:
        urls: List of image URLs to validate

    Returns:
        List of valid image URLs
    """
    valid_urls = []
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.svg', '.webp'}

    for url in urls:
        if not url or not isinstance(url, str):
            continue

        try:
            parsed = urlparse(url.strip())
            if not parsed.scheme or not parsed.netloc:
                continue

            # Check if URL ends with allowed extension
            path_lower = parsed.path.lower()
            if any(path_lower.endswith(ext) for ext in allowed_extensions):
                valid_urls.append(url.strip())

        except Exception:
            continue

    return valid_urls


def sanitize_html(text: str) -> str:
    """
    Basic HTML sanitization for question content

    Args:
        text: Text that may contain HTML

    Returns:
        Sanitized text
    """
    if not text:
        return ""

    # Remove script tags completely
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)

    # Remove potentially dangerous attributes
    text = re.sub(r'\s*on\w+\s*=\s*["\'][^"\']*["\']', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*javascript:', '', text, flags=re.IGNORECASE)

    # Allow basic formatting tags only
    allowed_tags = {'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'code', 'pre', 'ul', 'ol', 'li'}

    # This is a simplified sanitizer - in production, use a library like bleach
    return text.strip()


def validate_title(title: str) -> bool:
    """
    Validate question title

    Args:
        title: Question title to validate

    Returns:
        True if valid, False otherwise
    """
    if not title or not isinstance(title, str):
        return False

    title = title.strip()
    if len(title) < 1 or len(title) > 255:
        return False

    # Check for basic validity (no HTML tags in title)
    if '<' in title or '>' in title:
        return False

    return True


def validate_topics(topics: List[str]) -> bool:
    """
    Validate question topics

    Args:
        topics: List of topic strings

    Returns:
        True if valid, False otherwise
    """
    if not topics or not isinstance(topics, list):
        return False

    if len(topics) == 0 or len(topics) > 10:
        return False

    for topic in topics:
        if not isinstance(topic, str) or not topic.strip():
            return False
        if len(topic.strip()) > 50:
            return False

    return True