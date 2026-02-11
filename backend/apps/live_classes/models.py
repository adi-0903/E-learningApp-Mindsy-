"""
Live Class models - Scheduling, participants, Agora token generation.
"""
import time
from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class LiveClass(TimeStampedModel):
    """A live class session created by a teacher."""

    class StatusChoices(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        LIVE = 'live', 'Live'
        ENDED = 'ended', 'Ended'
        CANCELLED = 'cancelled', 'Cancelled'

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='live_classes_hosted',
        limit_choices_to={'role': 'teacher'},
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='live_classes',
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    scheduled_at = models.DateTimeField(db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.SCHEDULED,
        db_index=True,
    )
    max_participants = models.PositiveIntegerField(default=100)
    channel_name = models.CharField(max_length=255, unique=True)
    recording_url = models.URLField(blank=True, default='')

    class Meta:
        db_table = 'live_classes'
        ordering = ['-scheduled_at']
        indexes = [
            models.Index(fields=['teacher', 'status']),
            models.Index(fields=['status', '-scheduled_at']),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"

    @property
    def participant_count(self):
        return self.participants.filter(left_at__isnull=True).count()

    @property
    def jitsi_room_url(self):
        """Get the full Jitsi Meet URL for this class."""
        domain = getattr(settings, 'JITSI_DOMAIN', 'meet.jit.si')
        return f"https://{domain}/{self.channel_name}"



class LiveClassParticipant(TimeStampedModel):
    """Tracks who is in a live class."""
    live_class = models.ForeignKey(
        LiveClass,
        on_delete=models.CASCADE,
        related_name='participants',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='live_class_participations',
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'live_class_participants'
        unique_together = ['live_class', 'user']

    def __str__(self):
        return f"{self.user.name} in {self.live_class.title}"


class LiveClassChat(TimeStampedModel):
    """Chat messages within a live class."""
    live_class = models.ForeignKey(
        LiveClass,
        on_delete=models.CASCADE,
        related_name='chat_messages',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'live_class_chat'
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.user.name}: {self.message[:50]}"
