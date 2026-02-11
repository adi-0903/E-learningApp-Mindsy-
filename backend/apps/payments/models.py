"""
Payment models - Stripe-based payment tracking.
"""
from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class Payment(TimeStampedModel):
    """Records a payment transaction."""

    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'
        CANCELLED = 'cancelled', 'Cancelled'

    class MethodChoices(models.TextChoices):
        STRIPE = 'stripe', 'Stripe'
        FREE = 'free', 'Free Enrollment'

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments',
        limit_choices_to={'role': 'student'},
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        db_index=True,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=MethodChoices.choices,
        default=MethodChoices.STRIPE,
    )

    # Stripe fields
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, default='')
    stripe_charge_id = models.CharField(max_length=255, blank=True, default='')

    # Metadata
    receipt_url = models.URLField(blank=True, default='')
    refund_reason = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['course', 'status']),
            models.Index(fields=['stripe_payment_intent_id']),
        ]

    def __str__(self):
        return f"{self.student.name} - {self.course.title} ({self.amount} {self.currency}) [{self.status}]"
