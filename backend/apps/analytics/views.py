"""
Analytics views - Platform and course analytics (teacher/admin only).
"""
from django.db.models import Avg, Sum
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsTeacher

from .models import CourseAnalytics, DailyAnalytics
from .serializers import CourseAnalyticsSerializer, DailyAnalyticsSerializer


class PlatformAnalyticsView(APIView):
    """
    GET /api/v1/analytics/platform/
    Returns the latest platform-wide analytics snapshot.
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        latest = DailyAnalytics.objects.first()
        if not latest:
            return Response({'success': True, 'data': None})
        return Response({
            'success': True,
            'data': DailyAnalyticsSerializer(latest).data,
        })


class PlatformAnalyticsHistoryView(generics.ListAPIView):
    """
    GET /api/v1/analytics/platform/history/?days=30
    Returns daily analytics for the last N days.
    """
    serializer_class = DailyAnalyticsSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        days = int(self.request.query_params.get('days', 30))
        return DailyAnalytics.objects.all()[:days]


class CourseAnalyticsView(APIView):
    """
    GET /api/v1/analytics/course/<course_id>/
    Returns analytics for a specific course.
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, course_id):
        days = int(request.query_params.get('days', 30))
        analytics = CourseAnalytics.objects.filter(
            course_id=course_id
        ).order_by('-date')[:days]

        # Aggregates
        totals = CourseAnalytics.objects.filter(course_id=course_id).aggregate(
            total_views=Sum('views'),
            total_enrollments=Sum('enrollments'),
            total_completions=Sum('completions'),
            avg_progress=Avg('avg_progress'),
            avg_quiz_score=Avg('avg_quiz_score'),
            total_revenue=Sum('revenue'),
        )

        return Response({
            'success': True,
            'data': {
                'history': CourseAnalyticsSerializer(analytics, many=True).data,
                'totals': totals,
            },
        })
