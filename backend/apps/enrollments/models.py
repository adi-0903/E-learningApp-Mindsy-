"""
Enrollment model - Tracks student-course relationships.
"""
from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class Enrollment(TimeStampedModel):
    """Records a student enrolling in a course."""
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollments',
        limit_choices_to={'role': 'student'},
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='enrollments',
    )
    is_active = models.BooleanField(default=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    unenrolled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'enrollments'
        unique_together = ['student', 'course']
        indexes = [
            models.Index(fields=['student', 'is_active']),
            models.Index(fields=['course', 'is_active']),
        ]

    def __str__(self):
        return f"{self.student.name} → {self.course.title}"
