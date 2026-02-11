"""
Teacher-specific serializers.
Handles teacher dashboard, course management stats, student analytics.
"""
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from rest_framework import serializers

from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.quizzes.models import QuizAttempt

User = get_user_model()


class TeacherCourseStatsSerializer(serializers.ModelSerializer):
    """Course with enrollment and performance stats for the teacher."""
    total_students = serializers.SerializerMethodField()
    total_lessons = serializers.SerializerMethodField()
    total_quizzes = serializers.SerializerMethodField()
    avg_quiz_score = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    teacher_id = serializers.UUIDField(source='teacher.id', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'category', 'level',
            'cover_image_url', 'is_published', 'duration',
            'total_students', 'total_lessons', 'total_quizzes',
            'avg_quiz_score', 'created_at', 'updated_at', 'teacher_id', 'teacher_name',
        ]

    def get_total_students(self, obj):
        return Enrollment.objects.filter(course=obj, is_active=True).count()

    def get_total_lessons(self, obj):
        return obj.lessons.count()

    def get_total_quizzes(self, obj):
        return obj.quizzes.count()

    def get_avg_quiz_score(self, obj):
        avg = QuizAttempt.objects.filter(
            quiz__course=obj
        ).aggregate(avg=Avg('score'))['avg']
        return round(avg, 1) if avg else None

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            return obj.cover_image.url
        return None


class TeacherDashboardSerializer(serializers.Serializer):
    """Aggregated dashboard data for the teacher."""
    total_courses = serializers.IntegerField()
    published_courses = serializers.IntegerField()
    draft_courses = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_lessons = serializers.IntegerField()
    total_quizzes = serializers.IntegerField()
    total_quiz_attempts = serializers.IntegerField()
    average_quiz_score = serializers.FloatField()
    recent_courses = TeacherCourseStatsSerializer(many=True)


class TeacherStudentDetailSerializer(serializers.Serializer):
    """Detail of a student enrolled in the teacher's courses."""
    student_id = serializers.UUIDField()
    student_name = serializers.CharField()
    student_email = serializers.CharField()
    enrolled_courses = serializers.IntegerField()
    average_progress = serializers.FloatField()
    average_quiz_score = serializers.FloatField(allow_null=True)
    last_active = serializers.DateTimeField(allow_null=True)


class CourseStudentProgressSerializer(serializers.Serializer):
    """Per-student progress within a specific course."""
    student_id = serializers.UUIDField()
    student_name = serializers.CharField()
    lessons_completed = serializers.IntegerField()
    total_lessons = serializers.IntegerField()
    progress_percentage = serializers.FloatField()
    quiz_attempts = serializers.IntegerField()
    avg_quiz_score = serializers.FloatField(allow_null=True)
    enrolled_at = serializers.DateTimeField()
