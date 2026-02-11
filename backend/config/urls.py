"""
MentiQ E-Learning Platform - URL Configuration
All API endpoints versioned under /api/v1/
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.core.views import HealthCheckView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Health Check
    path('api/health/', HealthCheckView.as_view(), name='health-check'),

    # API v1
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/students/', include('apps.students.urls')),
    path('api/v1/teachers/', include('apps.teachers.urls')),
    path('api/v1/courses/', include('apps.courses.urls')),
    path('api/v1/lessons/', include('apps.lessons.urls')),
    path('api/v1/quizzes/', include('apps.quizzes.urls')),
    path('api/v1/enrollments/', include('apps.enrollments.urls')),
    path('api/v1/progress/', include('apps.progress.urls')),
    path('api/v1/live-classes/', include('apps.live_classes.urls')),
    path('api/v1/announcements/', include('apps.announcements.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/media/', include('apps.media.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
