"""
Enrollment views - Enroll, unenroll, check status.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStudent
from apps.courses.models import Course
from apps.progress.models import CourseProgress

from .models import Enrollment
from .serializers import EnrollmentSerializer, EnrollSerializer


class EnrollView(APIView):
    """
    POST /api/v1/enrollments/enroll/
    Enroll the current student in a course.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = EnrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course_id = serializer.validated_data['course_id']
        try:
            course = Course.objects.get(id=course_id, is_published=True, is_deleted=False)
        except Course.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Course not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if already enrolled
        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            course=course,
            defaults={'is_active': True},
        )

        if not created:
            if enrollment.is_active:
                return Response(
                    {'success': False, 'error': {'message': 'Already enrolled in this course.'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Re-enroll
            enrollment.is_active = True
            enrollment.unenrolled_at = None
            enrollment.save()

        # Create course progress record
        CourseProgress.objects.get_or_create(
            student=request.user,
            course=course,
            defaults={'progress_percentage': 0},
        )

        return Response({
            'success': True,
            'message': 'Enrolled successfully.',
            'data': EnrollmentSerializer(enrollment).data,
        }, status=status.HTTP_201_CREATED)


class UnenrollView(APIView):
    """
    POST /api/v1/enrollments/unenroll/
    Unenroll the current student from a course.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = EnrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course_id = serializer.validated_data['course_id']
        try:
            enrollment = Enrollment.objects.get(
                student=request.user, course_id=course_id, is_active=True
            )
        except Enrollment.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Not enrolled in this course.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        enrollment.is_active = False
        enrollment.unenrolled_at = timezone.now()
        enrollment.save()

        return Response({'success': True, 'message': 'Unenrolled successfully.'})


class EnrollmentStatusView(APIView):
    """
    GET /api/v1/enrollments/status/<course_id>/
    Check if the current student is enrolled in a course.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        is_enrolled = Enrollment.objects.filter(
            student=request.user, course_id=course_id, is_active=True
        ).exists()
        return Response({
            'success': True,
            'data': {'is_enrolled': is_enrolled}
        })
