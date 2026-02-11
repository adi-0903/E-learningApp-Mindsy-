"""
Course model - The core content unit of the platform.
"""
from django.conf import settings
from django.db import models
from apps.core.models import SoftDeleteModel


class Course(SoftDeleteModel):
    """Represents a course created by a teacher."""

    class LevelChoices(models.TextChoices):
        BEGINNER = 'beginner', 'Beginner'
        INTERMEDIATE = 'intermediate', 'Intermediate'
        ADVANCED = 'advanced', 'Advanced'
        ALL_LEVELS = 'all_levels', 'All Levels'

    class CategoryChoices(models.TextChoices):
        MATHEMATICS = 'mathematics', 'Mathematics'
        SCIENCE = 'science', 'Science'
        ENGLISH = 'english', 'English'
        HISTORY = 'history', 'History'
        COMPUTER_SCIENCE = 'computer_science', 'Computer Science'
        PHYSICS = 'physics', 'Physics'
        CHEMISTRY = 'chemistry', 'Chemistry'
        BIOLOGY = 'biology', 'Biology'
        ARTS = 'arts', 'Arts'
        MUSIC = 'music', 'Music'
        BUSINESS = 'business', 'Business'
        OTHER = 'other', 'Other'

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courses',
        limit_choices_to={'role': 'teacher'},
    )
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, default='')
    category = models.CharField(
        max_length=50,
        choices=CategoryChoices.choices,
        default=CategoryChoices.OTHER,
        db_index=True,
    )
    level = models.CharField(
        max_length=20,
        choices=LevelChoices.choices,
        default=LevelChoices.ALL_LEVELS,
        db_index=True,
    )
    cover_image = models.ImageField(
        upload_to='course_covers/%Y/%m/',
        blank=True,
        null=True,
    )
    duration = models.CharField(max_length=50, blank=True, default='',
                                 help_text='Estimated duration e.g. "4 weeks"')
    is_published = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False)

    # Pricing (for future payment integration)
    is_free = models.BooleanField(default=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'courses'
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['teacher', 'is_published']),
            models.Index(fields=['category', 'level']),
            models.Index(fields=['is_published', '-created_at']),
        ]

    def __str__(self):
        return self.title

    @property
    def student_count(self):
        return self.enrollments.filter(is_active=True).count()

    @property
    def lesson_count(self):
        return self.lessons.count()

    @property
    def quiz_count(self):
        return self.quizzes.count()
