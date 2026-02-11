"""
Progress models - Lesson-level and course-level progress tracking.
"""
from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class LessonProgress(TimeStampedModel):
    """Tracks whether a student has completed a specific lesson."""
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lesson_progresses',
    )
    lesson = models.ForeignKey(
        'lessons.Lesson',
        on_delete=models.CASCADE,
        related_name='progresses',
    )
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent = models.PositiveIntegerField(default=0, help_text='Time spent in seconds')

    class Meta:
        db_table = 'lesson_progress'
        unique_together = ['student', 'lesson']
        indexes = [
            models.Index(fields=['student', 'completed']),
            models.Index(fields=['lesson', 'completed']),
        ]

    def __str__(self):
        status = '✅' if self.completed else '⏳'
        return f"{status} {self.student.name} - {self.lesson.title}"


class CourseProgress(TimeStampedModel):
    """Aggregated course-level progress for a student."""
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_progresses',
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='progresses',
    )
    progress_percentage = models.FloatField(default=0.0)
    last_lesson = models.ForeignKey(
        'lessons.Lesson',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )

    class Meta:
        db_table = 'course_progress'
        unique_together = ['student', 'course']
        indexes = [
            models.Index(fields=['student', 'progress_percentage']),
        ]

    def __str__(self):
        return f"{self.student.name} - {self.course.title}: {self.progress_percentage}%"

    def recalculate(self):
        """Recalculate progress_percentage from lesson completions."""
        total = self.course.lessons.filter(is_deleted=False).count()
        if total == 0:
            self.progress_percentage = 0
        else:
            completed = LessonProgress.objects.filter(
                student=self.student,
                lesson__course=self.course,
                completed=True,
            ).count()
            self.progress_percentage = round((completed / total) * 100, 1)
        self.save(update_fields=['progress_percentage', 'updated_at'])
