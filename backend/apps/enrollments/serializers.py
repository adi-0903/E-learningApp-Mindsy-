from rest_framework import serializers
from .models import Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'student_name', 'course', 'course_title', 'is_active', 'enrolled_at']
        read_only_fields = ['id', 'student', 'enrolled_at']


class EnrollSerializer(serializers.Serializer):
    """Enroll a student in a course."""
    course_id = serializers.UUIDField()
