from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@shared_task
def cleanup_stale_classes():
    """End live classes that have been running for more than 4 hours."""
    from .models import LiveClass
    stale = LiveClass.objects.filter(
        status='live',
        started_at__lt=timezone.now() - timezone.timedelta(hours=4),
    )
    count = stale.update(status='ended', ended_at=timezone.now())
    logger.info(f"Cleaned up {count} stale live classes.")
