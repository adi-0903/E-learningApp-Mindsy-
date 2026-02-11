"""
Notification model - Push and in-app notifications.
"""
from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """In-app notification for a user."""

    class TypeChoices(models.TextChoices):
        ANNOUNCEMENT = 'announcement', 'Announcement'
        COURSE = 'course', 'Course Update'
        QUIZ = 'quiz', 'Quiz'
        LIVE_CLASS = 'live_class', 'Live Class'
        ENROLLMENT = 'enrollment', 'Enrollment'
        PROGRESS = 'progress', 'Progress'
        SYSTEM = 'system', 'System'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=TypeChoices.choices,
        default=TypeChoices.SYSTEM,
    )
    is_read = models.BooleanField(default=False, db_index=True)
    data = models.JSONField(default=dict, blank=True,
                             help_text='Extra payload (e.g. course_id, quiz_id)')

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"{'📩' if not self.is_read else '✅'} {self.user.name}: {self.title}"
