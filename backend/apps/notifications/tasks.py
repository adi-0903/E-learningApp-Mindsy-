"""
Notification helper to create notifications and send FCM push.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


def create_notification(user, title, body, notification_type='system', data=None):
    """Create an in-app notification and queue FCM push."""
    from .models import Notification
    notif = Notification.objects.create(
        user=user,
        title=title,
        body=body,
        notification_type=notification_type,
        data=data or {},
    )
    # Queue push notification
    if user.fcm_token:
        send_push_notification.delay(str(user.id), title, body, data or {})
    return notif


def bulk_create_notifications(users, title, body, notification_type='system', data=None):
    """Create notifications for multiple users."""
    from .models import Notification
    notifications = [
        Notification(
            user=user,
            title=title,
            body=body,
            notification_type=notification_type,
            data=data or {},
        )
        for user in users
    ]
    Notification.objects.bulk_create(notifications)


@shared_task
def send_push_notification(user_id, title, body, data):
    """Send FCM push notification via Firebase Admin SDK."""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(id=user_id)

        if not user.fcm_token:
            return

        # FCM push (requires firebase-admin SDK)
        try:
            import firebase_admin
            from firebase_admin import messaging

            if not firebase_admin._apps:
                firebase_admin.initialize_app()

            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={k: str(v) for k, v in data.items()},
                token=user.fcm_token,
            )
            messaging.send(message)
            logger.info(f"Push notification sent to {user.email}")
        except ImportError:
            logger.warning("firebase-admin not installed, skipping FCM push.")
        except Exception as e:
            logger.error(f"FCM push failed for {user.email}: {e}")

    except Exception as e:
        logger.error(f"Push notification task error: {e}")
