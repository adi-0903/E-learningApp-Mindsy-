from rest_framework import serializers
from .models import CourseProgress, LessonProgress


class LessonProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = LessonProgress
        fields = ['id', 'lesson', 'lesson_title', 'completed', 'completed_at', 'time_spent']
        read_only_fields = ['id', 'completed_at']


class CourseProgressSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = CourseProgress
        fields = ['id', 'course', 'course_title', 'progress_percentage', 'last_lesson', 'updated_at']
        read_only_fields = fields


class MarkLessonCompleteSerializer(serializers.Serializer):
    lesson_id = serializers.UUIDField()
    time_spent = serializers.IntegerField(required=False, default=0)
