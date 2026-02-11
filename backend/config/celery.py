"""
Celery configuration for MentiQ E-Learning Platform
Handles background tasks: video processing, emails, notifications, analytics
"""
import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('mentiq')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic Tasks Schedule
app.conf.beat_schedule = {
    # Clean up expired tokens every day at midnight
    'cleanup-expired-tokens': {
        'task': 'apps.users.tasks.cleanup_expired_tokens',
        'schedule': crontab(hour=0, minute=0),
    },
    # Generate daily analytics at 1 AM
    'generate-daily-analytics': {
        'task': 'apps.analytics.tasks.generate_daily_report',
        'schedule': crontab(hour=1, minute=0),
    },
    # Clean up stale live classes every hour
    'cleanup-stale-live-classes': {
        'task': 'apps.live_classes.tasks.cleanup_stale_classes',
        'schedule': crontab(minute=0),
    },
    # Send progress reminder emails weekly on Monday
    'weekly-progress-reminders': {
        'task': 'apps.notifications.tasks.send_weekly_progress_reminders',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
