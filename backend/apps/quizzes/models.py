"""
Quiz models - Quizzes, Questions, and Attempts.
"""
from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class Quiz(TimeStampedModel):
    """A quiz associated with a course."""
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='quizzes',
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    duration = models.PositiveIntegerField(default=30, help_text='Time limit in minutes (0 = unlimited)')
    passing_score = models.PositiveIntegerField(default=60, help_text='Passing percentage')
    is_published = models.BooleanField(default=False)
    max_attempts = models.PositiveIntegerField(default=0, help_text='0 = unlimited attempts')

    class Meta:
        db_table = 'quizzes'
        verbose_name = 'Quiz'
        verbose_name_plural = 'Quizzes'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

    @property
    def question_count(self):
        return self.questions.count()


class QuizQuestion(TimeStampedModel):
    """A multiple-choice question within a quiz."""
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='questions',
    )
    question_text = models.TextField()
    option_a = models.CharField(max_length=500)
    option_b = models.CharField(max_length=500)
    option_c = models.CharField(max_length=500, blank=True, default='')
    option_d = models.CharField(max_length=500, blank=True, default='')
    correct_answer = models.CharField(
        max_length=1,
        choices=[('a', 'A'), ('b', 'B'), ('c', 'C'), ('d', 'D')],
        help_text='The correct option letter (a, b, c, or d)',
    )
    sequence_number = models.PositiveIntegerField(default=1)
    explanation = models.TextField(blank=True, default='', help_text='Explanation shown after answering')

    class Meta:
        db_table = 'quiz_questions'
        ordering = ['sequence_number']
        unique_together = ['quiz', 'sequence_number']

    def __str__(self):
        return f"Q{self.sequence_number}: {self.question_text[:50]}"

    @property
    def options(self):
        opts = {'a': self.option_a, 'b': self.option_b}
        if self.option_c:
            opts['c'] = self.option_c
        if self.option_d:
            opts['d'] = self.option_d
        return opts


class QuizAttempt(TimeStampedModel):
    """Records a student's attempt at a quiz."""
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='attempts',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts',
        limit_choices_to={'role': 'student'},
    )
    score = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    answers = models.JSONField(default=dict, help_text='{"question_id": "selected_answer"}')
    completed_at = models.DateTimeField(auto_now_add=True)
    time_taken = models.PositiveIntegerField(default=0, help_text='Time taken in seconds')

    class Meta:
        db_table = 'quiz_attempts'
        ordering = ['-completed_at']
        indexes = [
            models.Index(fields=['student', 'quiz']),
            models.Index(fields=['quiz', '-completed_at']),
        ]

    def __str__(self):
        return f"{self.student.name} - {self.quiz.title} ({self.score}/{self.total_questions})"

    @property
    def percentage(self):
        if self.total_questions > 0:
            return round((self.score / self.total_questions) * 100, 1)
        return 0

    @property
    def passed(self):
        return self.percentage >= self.quiz.passing_score
