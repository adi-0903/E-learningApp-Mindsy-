"""
Teacher-specific views.
All endpoints here are restricted to users with role='teacher'.
"""
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsTeacher
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.lessons.models import Lesson
from apps.progress.models import CourseProgress, LessonProgress
from apps.quizzes.models import Quiz, QuizAttempt

from .serializers import (
    CourseStudentProgressSerializer,
    TeacherCourseStatsSerializer,
    TeacherDashboardSerializer,
    TeacherStudentDetailSerializer,
)

User = get_user_model()


class TeacherDashboardView(APIView):
    """
    GET /api/v1/teachers/dashboard/
    Returns aggregated dashboard data for the logged-in teacher.
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        teacher = request.user
        courses = Course.objects.filter(teacher=teacher, is_deleted=False)

        total_courses = courses.count()
        published = courses.filter(is_published=True).count()
        draft = total_courses - published

        # Total unique students across all courses
        total_students = Enrollment.objects.filter(
            course__in=courses, is_active=True
        ).values('student').distinct().count()

        # Lesson & Quiz counts
        total_lessons = Lesson.objects.filter(course__in=courses).count()
        total_quizzes = Quiz.objects.filter(course__in=courses).count()

        # Quiz attempt stats
        attempts = QuizAttempt.objects.filter(quiz__course__in=courses)
        total_attempts = attempts.count()
        avg_score = attempts.aggregate(avg=Avg('score'))['avg'] or 0.0

        # Recent courses
        recent = courses.order_by('-updated_at')[:5]

        data = {
            'total_courses': total_courses,
            'published_courses': published,
            'draft_courses': draft,
            'total_students': total_students,
            'total_lessons': total_lessons,
            'total_quizzes': total_quizzes,
            'total_quiz_attempts': total_attempts,
            'average_quiz_score': round(avg_score, 1),
            'recent_courses': TeacherCourseStatsSerializer(
                recent, many=True, context={'request': request}
            ).data,
        }

        return Response({'success': True, 'data': data})


class TeacherCoursesView(generics.ListAPIView):
    """
    GET /api/v1/teachers/courses/
    Lists all courses owned by the teacher with stats.
    """
    serializer_class = TeacherCourseStatsSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Course.objects.filter(
            teacher=self.request.user, is_deleted=False
        ).select_related('teacher')

        # Filter by publish status
        published = self.request.query_params.get('published')
        if published is not None:
            queryset = queryset.filter(is_published=published.lower() == 'true')

        # Search
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        return queryset.order_by('-updated_at')


class TeacherStudentsView(APIView):
    """
    GET /api/v1/teachers/students/
    Lists all students enrolled in the teacher's courses with their progress.
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        teacher = request.user
        courses = Course.objects.filter(teacher=teacher, is_deleted=False)

        # Get unique students
        student_ids = Enrollment.objects.filter(
            course__in=courses, is_active=True
        ).values_list('student_id', flat=True).distinct()

        students_data = []
        for sid in student_ids:
            student = User.objects.get(id=sid)

            # Courses enrolled under this teacher
            enrolled_count = Enrollment.objects.filter(
                student=student, course__in=courses, is_active=True
            ).count()

            # Average progress
            avg_progress = CourseProgress.objects.filter(
                student=student, course__in=courses
            ).aggregate(avg=Avg('progress_percentage'))['avg'] or 0.0

            # Average quiz
            avg_quiz = QuizAttempt.objects.filter(
                student=student, quiz__course__in=courses
            ).aggregate(avg=Avg('score'))['avg']

            # Last active
            last_progress = CourseProgress.objects.filter(
                student=student, course__in=courses
            ).order_by('-updated_at').first()

            students_data.append({
                'student_id': student.id,
                'student_name': student.name,
                'student_email': student.email,
                'enrolled_courses': enrolled_count,
                'average_progress': round(avg_progress, 1),
                'average_quiz_score': round(avg_quiz, 1) if avg_quiz else None,
                'last_active': last_progress.updated_at if last_progress else None,
            })

        # Sort by name
        students_data.sort(key=lambda x: x['student_name'].lower())

        return Response({'success': True, 'data': students_data})


class TeacherCourseStudentsView(APIView):
    """
    GET /api/v1/teachers/courses/<course_id>/students/
    Lists all students enrolled in a specific course with their progress.
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, teacher=request.user)
        except Course.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Course not found.'}},
                status=status.HTTP_404_NOT_FOUND
            )

        total_lessons = course.lessons.count()
        enrollments = Enrollment.objects.filter(
            course=course, is_active=True
        ).select_related('student').order_by('-enrolled_at')

        students_data = []
        for enrollment in enrollments:
            student = enrollment.student

            completed_lessons = LessonProgress.objects.filter(
                student=student, lesson__course=course, completed=True
            ).count()

            progress_pct = 0
            if total_lessons > 0:
                progress_pct = round((completed_lessons / total_lessons) * 100, 1)

            quiz_attempts = QuizAttempt.objects.filter(
                student=student, quiz__course=course
            )
            avg_quiz = quiz_attempts.aggregate(avg=Avg('score'))['avg']

            students_data.append({
                'student_id': student.id,
                'student_name': student.name,
                'lessons_completed': completed_lessons,
                'total_lessons': total_lessons,
                'progress_percentage': progress_pct,
                'quiz_attempts': quiz_attempts.count(),
                'avg_quiz_score': round(avg_quiz, 1) if avg_quiz else None,
                'enrolled_at': enrollment.enrolled_at,
            })

        return Response({'success': True, 'data': students_data})
