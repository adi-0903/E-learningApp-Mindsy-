"""
Lesson model - Individual learning units within a course.
"""
from django.db import models
from apps.core.models import SoftDeleteModel


class Lesson(SoftDeleteModel):
    """A single lesson belonging to a course."""

    class FileTypeChoices(models.TextChoices):
        VIDEO = 'video', 'Video'
        PDF = 'pdf', 'PDF'
        DOCUMENT = 'document', 'Document'
        PRESENTATION = 'presentation', 'Presentation'
        OTHER = 'other', 'Other'

    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='lessons',
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    content = models.TextField(blank=True, default='', help_text='Rich text lesson content')
    sequence_number = models.PositiveIntegerField(default=1, db_index=True)

    # Media
    video_url = models.URLField(blank=True, default='')
    video_file = models.FileField(upload_to='lesson_videos/%Y/%m/', blank=True, null=True)
    attachment = models.FileField(upload_to='lesson_files/%Y/%m/', blank=True, null=True)
    file_type = models.CharField(
        max_length=20,
        choices=FileTypeChoices.choices,
        blank=True,
        default='',
    )
    duration = models.PositiveIntegerField(default=0, help_text='Duration in minutes')

    class Meta:
        db_table = 'lessons'
        verbose_name = 'Lesson'
        verbose_name_plural = 'Lessons'
        ordering = ['sequence_number']
        indexes = [
            models.Index(fields=['course', 'sequence_number']),
        ]
        unique_together = ['course', 'sequence_number']

    def __str__(self):
        return f"{self.course.title} - {self.title}"
