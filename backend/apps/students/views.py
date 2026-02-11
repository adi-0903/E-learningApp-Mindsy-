"""
Student-specific views.
All endpoints here are restricted to users with role='student'.
"""
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsStudent
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.lessons.models import Lesson
from apps.progress.models import CourseProgress, LessonProgress
from apps.quizzes.models import QuizAttempt

from .serializers import (
    StudentCourseSerializer,
    StudentDashboardSerializer,
    StudentProgressSummarySerializer,
    StudentQuizResultSerializer,
)

User = get_user_model()


class StudentDashboardView(APIView):
    """
    GET /api/v1/students/dashboard/
    Returns aggregated dashboard data for the logged-in student.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user

        # Enrolled courses
        enrolled_ids = Enrollment.objects.filter(
            student=student, is_active=True
        ).values_list('course_id', flat=True)

        enrolled_courses = Course.objects.filter(id__in=enrolled_ids)
        total_enrolled = enrolled_courses.count()

        # Progress stats
        course_progresses = CourseProgress.objects.filter(student=student, course__in=enrolled_courses)
        completed = course_progresses.filter(progress_percentage=100).count()
        in_progress = total_enrolled - completed

        # Lesson stats
        total_lessons_completed = LessonProgress.objects.filter(
            student=student, completed=True
        ).count()

        # Quiz stats
        quiz_attempts = QuizAttempt.objects.filter(student=student)
        total_quizzes = quiz_attempts.count()
        avg_score = quiz_attempts.aggregate(
            avg=Avg('score')
        )['avg'] or 0.0

        # Overall progress
        overall = course_progresses.aggregate(
            avg=Avg('progress_percentage')
        )['avg'] or 0.0

        # Recent 5 courses
        recent_courses = enrolled_courses.order_by('-updated_at')[:5]

        data = {
            'total_enrolled_courses': total_enrolled,
            'completed_courses': completed,
            'in_progress_courses': in_progress,
            'total_quizzes_taken': total_quizzes,
            'average_quiz_score': round(avg_score, 1),
            'total_lessons_completed': total_lessons_completed,
            'recent_courses': StudentCourseSerializer(
                recent_courses, many=True, context={'request': request}
            ).data,
            'overall_progress': round(overall, 1),
        }

        return Response({'success': True, 'data': data})


class StudentEnrolledCoursesView(generics.ListAPIView):
    """
    GET /api/v1/students/courses/
    Lists all courses the student is enrolled in with progress.
    """
    serializer_class = StudentCourseSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    pagination_class = StandardPagination

    def get_queryset(self):
        enrolled_ids = Enrollment.objects.filter(
            student=self.request.user, is_active=True
        ).values_list('course_id', flat=True)
        return Course.objects.filter(id__in=enrolled_ids).select_related('teacher')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})


class StudentProgressView(APIView):
    """
    GET /api/v1/students/progress/
    Returns progress summary for all enrolled courses.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user
        enrolled_ids = Enrollment.objects.filter(
            student=student, is_active=True
        ).values_list('course_id', flat=True)

        courses = Course.objects.filter(id__in=enrolled_ids)
        progress_data = []

        for course in courses:
            total_lessons = course.lessons.count()
            completed_lessons = LessonProgress.objects.filter(
                student=student, lesson__course=course, completed=True
            ).count()

            progress_pct = 0
            if total_lessons > 0:
                progress_pct = round((completed_lessons / total_lessons) * 100, 1)

            # Course progress record
            cp, _ = CourseProgress.objects.get_or_create(
                student=student, course=course,
                defaults={'progress_percentage': progress_pct}
            )

            # Quiz average for this course
            quiz_avg = QuizAttempt.objects.filter(
                student=student, quiz__course=course
            ).aggregate(avg=Avg('score'))['avg']

            progress_data.append({
                'course_id': course.id,
                'course_title': course.title,
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'progress_percentage': progress_pct,
                'last_accessed': cp.updated_at,
                'quiz_average': round(quiz_avg, 1) if quiz_avg else None,
            })

        return Response({'success': True, 'data': progress_data})


class StudentQuizHistoryView(generics.ListAPIView):
    """
    GET /api/v1/students/quiz-history/
    Lists all quiz attempts by the student.
    """
    serializer_class = StudentQuizResultSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    pagination_class = StandardPagination

    def get_queryset(self):
        return QuizAttempt.objects.filter(
            student=self.request.user
        ).select_related('quiz', 'quiz__course').order_by('-completed_at')


class StudentBrowseCoursesView(generics.ListAPIView):
    """
    GET /api/v1/students/browse/
    Browse all available courses with search & filter.
    """
    serializer_class = StudentCourseSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Course.objects.filter(
            is_published=True, is_deleted=False
        ).select_related('teacher')

        # Search
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(category__icontains=search)
            )

        # Filter by category
        category = self.request.query_params.get('category', '')
        if category:
            queryset = queryset.filter(category__iexact=category)

        # Filter by level
        level = self.request.query_params.get('level', '')
        if level:
            queryset = queryset.filter(level__iexact=level)

        # Sorting
        sort = self.request.query_params.get('sort', '-created_at')
        allowed_sorts = ['created_at', '-created_at', 'title', '-title']
        if sort in allowed_sorts:
            queryset = queryset.order_by(sort)

        return queryset
