"""
Custom permissions for role-based access control.
"""
from rest_framework.permissions import BasePermission


class IsTeacher(BasePermission):
    """Only allows access to users with role='teacher'."""
    message = 'Only teachers can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'teacher'
        )


class IsStudent(BasePermission):
    """Only allows access to users with role='student'."""
    message = 'Only students can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'student'
        )


class IsOwner(BasePermission):
    """Only allows access to the owner of an object."""
    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'teacher'):
            return obj.teacher == request.user
        if hasattr(obj, 'student'):
            return obj.student == request.user
        return False


class IsTeacherOrReadOnly(BasePermission):
    """Teachers can write, everyone authenticated can read."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == 'teacher'


class IsCourseTeacher(BasePermission):
    """Only the teacher who owns the course can modify it."""
    message = 'Only the course teacher can perform this action.'

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'course'):
            return obj.course.teacher == request.user
        if hasattr(obj, 'teacher'):
            return obj.teacher == request.user
        return False


class IsEnrolledStudent(BasePermission):
    """Only enrolled students can access course content."""
    message = 'You must be enrolled in this course to access this content.'

    def has_object_permission(self, request, view, obj):
        from apps.enrollments.models import Enrollment
        course = getattr(obj, 'course', obj)
        return Enrollment.objects.filter(
            student=request.user,
            course=course,
            is_active=True
        ).exists()
