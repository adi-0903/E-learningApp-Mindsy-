"""
Announcement models - Course-scoped or global announcements by teachers.
"""
from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class Announcement(TimeStampedModel):
    """An announcement from a teacher to enrolled students."""

    class PriorityChoices(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='announcements',
        limit_choices_to={'role': 'teacher'},
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='announcements',
        null=True,
        blank=True,
        help_text='Null = global announcement',
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    priority = models.CharField(
        max_length=10,
        choices=PriorityChoices.choices,
        default=PriorityChoices.NORMAL,
    )
    is_pinned = models.BooleanField(default=False)
    attachment = models.FileField(upload_to='announcements/%Y/%m/', blank=True, null=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['course', '-created_at']),
            models.Index(fields=['teacher', '-created_at']),
        ]

    def __str__(self):
        scope = self.course.title if self.course else 'Global'
        return f"[{scope}] {self.title}"
