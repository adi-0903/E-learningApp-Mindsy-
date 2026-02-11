"""
Course serializers for CRUD operations.
"""
from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Course

User = get_user_model()


class CourseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for course listings."""
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    student_count = serializers.ReadOnlyField()
    lesson_count = serializers.ReadOnlyField()
    quiz_count = serializers.ReadOnlyField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'category', 'level',
            'cover_image', 'duration', 'teacher_name',
            'is_published', 'is_free', 'price',
            'student_count', 'lesson_count', 'quiz_count',
            'created_at', 'updated_at',
        ]


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full course detail with teacher info and counts."""
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    teacher_id = serializers.UUIDField(source='teacher.id', read_only=True)
    student_count = serializers.ReadOnlyField()
    lesson_count = serializers.ReadOnlyField()
    quiz_count = serializers.ReadOnlyField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'category', 'level',
            'cover_image', 'duration', 'teacher_id', 'teacher_name',
            'is_published', 'is_featured', 'is_free', 'price',
            'student_count', 'lesson_count', 'quiz_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'teacher_id', 'teacher_name', 'created_at', 'updated_at']


class CourseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new course (teacher only)."""
    class Meta:
        model = Course
        fields = [
            'title', 'description', 'category', 'level',
            'cover_image', 'duration', 'is_published',
            'is_free', 'price',
        ]

    def validate_title(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError('Title must be at least 3 characters.')
        return value.strip()

    def create(self, validated_data):
        validated_data['teacher'] = self.context['request'].user
        return super().create(validated_data)


class CourseUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a course."""
    class Meta:
        model = Course
        fields = [
            'title', 'description', 'category', 'level',
            'cover_image', 'duration', 'is_published',
            'is_free', 'price',
        ]
