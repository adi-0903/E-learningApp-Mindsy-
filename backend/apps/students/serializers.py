"""
Student-specific serializers.
Handles student dashboard, enrolled courses, progress, and student-facing data.
"""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.progress.models import CourseProgress, LessonProgress
from apps.quizzes.models import QuizAttempt

User = get_user_model()


class StudentCourseSerializer(serializers.ModelSerializer):
    """Course data as seen by a student (with progress info)."""
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    total_lessons = serializers.SerializerMethodField()
    completed_lessons = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'category', 'level',
            'cover_image', 'duration', 'teacher_name',
            'total_lessons', 'completed_lessons', 'progress_percentage',
            'is_enrolled', 'created_at',
        ]

    def get_total_lessons(self, obj):
        return obj.lessons.count()

    def get_completed_lessons(self, obj):
        user = self.context.get('request')
        if user and hasattr(user, 'user'):
            user = user.user
            return LessonProgress.objects.filter(
                student=user, lesson__course=obj, completed=True
            ).count()
        return 0

    def get_progress_percentage(self, obj):
        user = self.context.get('request')
        if user and hasattr(user, 'user'):
            user = user.user
            try:
                progress = CourseProgress.objects.get(student=user, course=obj)
                return progress.progress_percentage
            except CourseProgress.DoesNotExist:
                return 0
        return 0

    def get_is_enrolled(self, obj):
        user = self.context.get('request')
        if user and hasattr(user, 'user'):
            user = user.user
            return Enrollment.objects.filter(
                student=user, course=obj, is_active=True
            ).exists()
        return False


class StudentDashboardSerializer(serializers.Serializer):
    """Aggregated data for the student dashboard."""
    total_enrolled_courses = serializers.IntegerField()
    completed_courses = serializers.IntegerField()
    in_progress_courses = serializers.IntegerField()
    total_quizzes_taken = serializers.IntegerField()
    average_quiz_score = serializers.FloatField()
    total_lessons_completed = serializers.IntegerField()
    recent_courses = StudentCourseSerializer(many=True)
    overall_progress = serializers.FloatField()


class StudentProgressSummarySerializer(serializers.Serializer):
    """Overall progress summary for a student."""
    course_id = serializers.UUIDField()
    course_title = serializers.CharField()
    total_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    progress_percentage = serializers.FloatField()
    last_accessed = serializers.DateTimeField()
    quiz_average = serializers.FloatField(allow_null=True)


class StudentQuizResultSerializer(serializers.ModelSerializer):
    """Quiz results as seen by the student."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    course_title = serializers.CharField(source='quiz.course.title', read_only=True)
    percentage = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz_title', 'course_title', 'score',
            'total_questions', 'percentage', 'completed_at',
        ]

    def get_percentage(self, obj):
        if obj.total_questions > 0:
            return round((obj.score / obj.total_questions) * 100, 1)
        return 0
