"""
Progress views - Mark lessons complete, get progress.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsStudent
from apps.lessons.models import Lesson

from .models import CourseProgress, LessonProgress
from .serializers import (
    CourseProgressSerializer,
    LessonProgressSerializer,
    MarkLessonCompleteSerializer,
)


class MarkLessonCompleteView(APIView):
    """
    POST /api/v1/progress/complete/
    Mark a lesson as completed for the current student.
    Automatically recalculates course progress.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = MarkLessonCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lesson_id = serializer.validated_data['lesson_id']
        time_spent = serializer.validated_data.get('time_spent', 0)

        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_deleted=False)
        except Lesson.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Lesson not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create or update lesson progress
        lp, created = LessonProgress.objects.get_or_create(
            student=request.user,
            lesson=lesson,
            defaults={'completed': True, 'completed_at': timezone.now(), 'time_spent': time_spent},
        )

        if not created and not lp.completed:
            lp.completed = True
            lp.completed_at = timezone.now()
            lp.time_spent += time_spent
            lp.save()

        # Update course progress
        cp, _ = CourseProgress.objects.get_or_create(
            student=request.user,
            course=lesson.course,
        )
        cp.last_lesson = lesson
        cp.recalculate()

        return Response({
            'success': True,
            'message': 'Lesson marked as completed.',
            'data': {
                'lesson_progress': LessonProgressSerializer(lp).data,
                'course_progress': CourseProgressSerializer(cp).data,
            }
        })


class CourseProgressView(APIView):
    """
    GET /api/v1/progress/course/<course_id>/
    Get lesson-by-lesson progress for a course.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        # Course progress
        try:
            cp = CourseProgress.objects.get(student=request.user, course_id=course_id)
        except CourseProgress.DoesNotExist:
            cp = None

        # Lesson progress
        lesson_progresses = LessonProgress.objects.filter(
            student=request.user,
            lesson__course_id=course_id,
        ).select_related('lesson').order_by('lesson__sequence_number')

        return Response({
            'success': True,
            'data': {
                'course_progress': CourseProgressSerializer(cp).data if cp else None,
                'lessons': LessonProgressSerializer(lesson_progresses, many=True).data,
            }
        })
