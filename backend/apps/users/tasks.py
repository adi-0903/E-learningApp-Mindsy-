"""
User-related Celery tasks.
"""
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_tokens():
    """Remove expired/blacklisted JWT tokens from the database."""
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        expired = OutstandingToken.objects.filter(
            expires_at__lt=timezone.now()
        )
        count = expired.count()
        expired.delete()
        logger.info(f"Cleaned up {count} expired tokens.")
    except Exception as e:
        logger.error(f"Token cleanup error: {e}")


@shared_task
def send_weekly_progress_reminders():
    """Send weekly email/push reminders to students about their progress."""
    from django.contrib.auth import get_user_model
    from apps.enrollments.models import Enrollment
    from apps.progress.models import CourseProgress
    from apps.notifications.tasks import create_notification

    User = get_user_model()
    students = User.objects.filter(role='student', is_active=True)

    for student in students:
        active_enrollments = Enrollment.objects.filter(
            student=student, is_active=True
        ).count()

        if active_enrollments == 0:
            continue

        # Get incomplete courses
        incomplete = CourseProgress.objects.filter(
            student=student,
            progress_percentage__lt=100,
            progress_percentage__gt=0,
        ).select_related('course')

        if incomplete.exists():
            course_names = ', '.join([cp.course.title for cp in incomplete[:3]])
            create_notification(
                user=student,
                title='📚 Keep Learning!',
                body=f'You have {incomplete.count()} course(s) in progress: {course_names}. Keep going!',
                notification_type='progress',
            )

    logger.info("Weekly progress reminders sent.")


@shared_task
def deactivate_unverified_accounts():
    """Deactivate accounts not verified within 7 days."""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    cutoff = timezone.now() - timezone.timedelta(days=7)
    unverified = User.objects.filter(
        is_email_verified=False,
        is_active=True,
        created_at__lt=cutoff,
    ).exclude(is_staff=True)

    count = unverified.update(is_active=False)
    logger.info(f"Deactivated {count} unverified accounts.")
