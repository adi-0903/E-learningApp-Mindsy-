from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    path('platform/', views.PlatformAnalyticsView.as_view(), name='platform'),
    path('platform/history/', views.PlatformAnalyticsHistoryView.as_view(), name='platform-history'),
    path('course/<uuid:course_id>/', views.CourseAnalyticsView.as_view(), name='course'),
]
