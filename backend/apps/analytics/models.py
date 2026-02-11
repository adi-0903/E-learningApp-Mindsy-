"""
Analytics models - Daily snapshots for reporting.
"""
from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class DailyAnalytics(TimeStampedModel):
    """Daily snapshot of platform-wide analytics."""
    date = models.DateField(unique=True, db_index=True)

    # Users
    total_users = models.PositiveIntegerField(default=0)
    total_students = models.PositiveIntegerField(default=0)
    total_teachers = models.PositiveIntegerField(default=0)
    new_users_today = models.PositiveIntegerField(default=0)

    # Courses
    total_courses = models.PositiveIntegerField(default=0)
    published_courses = models.PositiveIntegerField(default=0)

    # Enrollments
    total_enrollments = models.PositiveIntegerField(default=0)
    new_enrollments_today = models.PositiveIntegerField(default=0)

    # Quizzes
    total_quiz_attempts = models.PositiveIntegerField(default=0)
    new_quiz_attempts_today = models.PositiveIntegerField(default=0)

    # Revenue
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    revenue_today = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'daily_analytics'
        ordering = ['-date']

    def __str__(self):
        return f"Analytics: {self.date}"


class CourseAnalytics(TimeStampedModel):
    """Per-course analytics snapshot."""
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='analytics',
    )
    date = models.DateField(db_index=True)
    views = models.PositiveIntegerField(default=0)
    enrollments = models.PositiveIntegerField(default=0)
    completions = models.PositiveIntegerField(default=0)
    avg_progress = models.FloatField(default=0.0)
    avg_quiz_score = models.FloatField(default=0.0)
    revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'course_analytics'
        unique_together = ['course', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.course.title} - {self.date}"
