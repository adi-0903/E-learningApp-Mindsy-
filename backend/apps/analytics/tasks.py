"""
Celery task to generate daily analytics snapshots.
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import Avg, Count, Sum
import logging

logger = logging.getLogger(__name__)


@shared_task
def generate_daily_analytics():
    """Generate daily analytics snapshot for the platform."""
    from django.contrib.auth import get_user_model
    from apps.courses.models import Course
    from apps.enrollments.models import Enrollment
    from apps.payments.models import Payment
    from apps.progress.models import CourseProgress
    from apps.quizzes.models import QuizAttempt
    from .models import CourseAnalytics, DailyAnalytics

    User = get_user_model()
    today = timezone.now().date()

    # Platform-wide
    total_users = User.objects.filter(is_active=True).count()
    total_students = User.objects.filter(role='student', is_active=True).count()
    total_teachers = User.objects.filter(role='teacher', is_active=True).count()
    new_users = User.objects.filter(created_at__date=today).count()

    total_courses = Course.objects.filter(is_deleted=False).count()
    published_courses = Course.objects.filter(is_published=True, is_deleted=False).count()

    total_enrollments = Enrollment.objects.filter(is_active=True).count()
    new_enrollments = Enrollment.objects.filter(enrolled_at__date=today).count()

    total_quiz_attempts = QuizAttempt.objects.count()
    new_quiz_attempts = QuizAttempt.objects.filter(completed_at__date=today).count()

    total_revenue = Payment.objects.filter(status='completed').aggregate(
        total=Sum('amount')
    )['total'] or 0
    revenue_today = Payment.objects.filter(
        status='completed', created_at__date=today
    ).aggregate(total=Sum('amount'))['total'] or 0

    DailyAnalytics.objects.update_or_create(
        date=today,
        defaults={
            'total_users': total_users,
            'total_students': total_students,
            'total_teachers': total_teachers,
            'new_users_today': new_users,
            'total_courses': total_courses,
            'published_courses': published_courses,
            'total_enrollments': total_enrollments,
            'new_enrollments_today': new_enrollments,
            'total_quiz_attempts': total_quiz_attempts,
            'new_quiz_attempts_today': new_quiz_attempts,
            'total_revenue': total_revenue,
            'revenue_today': revenue_today,
        }
    )

    # Per-course analytics
    for course in Course.objects.filter(is_deleted=False):
        enrollments = Enrollment.objects.filter(course=course, is_active=True).count()
        new_enroll = Enrollment.objects.filter(course=course, enrolled_at__date=today).count()
        completions = CourseProgress.objects.filter(
            course=course, progress_percentage=100
        ).count()
        avg_prog = CourseProgress.objects.filter(course=course).aggregate(
            avg=Avg('progress_percentage')
        )['avg'] or 0
        avg_quiz = QuizAttempt.objects.filter(quiz__course=course).aggregate(
            avg=Avg('score')
        )['avg'] or 0
        rev = Payment.objects.filter(
            course=course, status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0

        CourseAnalytics.objects.update_or_create(
            course=course,
            date=today,
            defaults={
                'enrollments': enrollments,
                'completions': completions,
                'avg_progress': round(avg_prog, 1),
                'avg_quiz_score': round(avg_quiz, 1),
                'revenue': rev,
            }
        )

    logger.info(f"Daily analytics generated for {today}")
