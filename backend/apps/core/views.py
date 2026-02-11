"""
Core views - Health check, API root info.
"""
from django.conf import settings
from django.db import connection
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """System health check endpoint - checks DB, Redis, and Celery."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        health = {
            'status': 'healthy',
            'version': '1.0.0',
            'services': {}
        }

        # Check Database
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            health['services']['database'] = {'status': 'up', 'type': 'postgresql'}
        except Exception as e:
            health['services']['database'] = {'status': 'down', 'error': str(e)}
            health['status'] = 'degraded'

        # Check Redis Cache
        try:
            cache.set('health_check', 'ok', 10)
            result = cache.get('health_check')
            if result == 'ok':
                health['services']['cache'] = {'status': 'up', 'type': 'redis'}
            else:
                health['services']['cache'] = {'status': 'degraded'}
                health['status'] = 'degraded'
        except Exception as e:
            health['services']['cache'] = {'status': 'down', 'error': str(e)}
            health['status'] = 'degraded'

        # Check Celery
        try:
            from config.celery import app as celery_app
            inspector = celery_app.control.inspect(timeout=2.0)
            active = inspector.active()
            if active is not None:
                health['services']['celery'] = {'status': 'up', 'workers': len(active)}
            else:
                health['services']['celery'] = {'status': 'down', 'workers': 0}
        except Exception:
            health['services']['celery'] = {'status': 'unknown'}

        status_code = status.HTTP_200_OK if health['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(health, status=status_code)
