"""
Custom middleware for request logging, performance monitoring.
"""
import logging
import time

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(MiddlewareMixin):
    """Logs every API request with method, path, status, and duration."""

    def process_request(self, request):
        request._start_time = time.time()

    def process_response(self, request, response):
        duration = time.time() - getattr(request, '_start_time', time.time())
        duration_ms = round(duration * 1000, 2)

        # Only log API requests
        if request.path.startswith('/api/'):
            user = getattr(request, 'user', None)
            user_id = user.id if user and user.is_authenticated else 'anonymous'
            logger.info(
                f"{request.method} {request.path} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration_ms}ms | "
                f"User: {user_id}"
            )

        # Add performance headers
        response['X-Request-Duration-Ms'] = str(duration_ms)
        return response
