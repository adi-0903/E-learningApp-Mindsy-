"""
Payment views - Stripe checkout, webhook, history.
"""
import logging

from django.conf import settings
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsStudent
from apps.courses.models import Course
from apps.enrollments.models import Enrollment
from apps.progress.models import CourseProgress

from .models import Payment
from .serializers import CreateCheckoutSerializer, PaymentSerializer

logger = logging.getLogger(__name__)


class CreateCheckoutView(APIView):
    """
    POST /api/v1/payments/checkout/
    Creates a Stripe checkout session for a paid course.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = CreateCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course_id = serializer.validated_data['course_id']
        try:
            course = Course.objects.get(id=course_id, is_published=True, is_deleted=False)
        except Course.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Course not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Free course — enroll directly
        if course.is_free:
            enrollment, created = Enrollment.objects.get_or_create(
                student=request.user, course=course,
                defaults={'is_active': True},
            )
            if not created and not enrollment.is_active:
                enrollment.is_active = True
                enrollment.unenrolled_at = None
                enrollment.save()

            CourseProgress.objects.get_or_create(
                student=request.user, course=course,
                defaults={'progress_percentage': 0},
            )

            Payment.objects.create(
                student=request.user, course=course,
                amount=0, status='completed', payment_method='free',
            )

            return Response({
                'success': True,
                'message': 'Enrolled in free course.',
                'data': {'enrolled': True},
            })

        # Stripe checkout for paid courses
        try:
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY

            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': course.title,
                            'description': course.description[:255] if course.description else '',
                        },
                        'unit_amount': int(course.price * 100),  # cents
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/payment/cancel",
                metadata={
                    'student_id': str(request.user.id),
                    'course_id': str(course.id),
                },
            )

            # Create pending payment record
            Payment.objects.create(
                student=request.user,
                course=course,
                amount=course.price,
                status='pending',
                payment_method='stripe',
                stripe_payment_intent_id=checkout_session.payment_intent or '',
            )

            return Response({
                'success': True,
                'data': {
                    'checkout_url': checkout_session.url,
                    'session_id': checkout_session.id,
                }
            })

        except ImportError:
            return Response(
                {'success': False, 'error': {'message': 'Stripe not configured.'}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.error(f"Stripe checkout error: {e}")
            return Response(
                {'success': False, 'error': {'message': 'Payment processing error.'}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StripeWebhookView(APIView):
    """
    POST /api/v1/payments/webhook/
    Handles Stripe webhook events.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        import json
        try:
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

            sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
            payload = request.body

            try:
                event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
            except (ValueError, stripe.error.SignatureVerificationError):
                return Response(status=status.HTTP_400_BAD_REQUEST)

            if event['type'] == 'checkout.session.completed':
                session = event['data']['object']
                student_id = session['metadata']['student_id']
                course_id = session['metadata']['course_id']

                # Update payment
                payment = Payment.objects.filter(
                    student_id=student_id,
                    course_id=course_id,
                    status='pending',
                ).first()

                if payment:
                    payment.status = 'completed'
                    payment.stripe_payment_intent_id = session.get('payment_intent', '')
                    payment.save()

                # Create enrollment
                enrollment, _ = Enrollment.objects.get_or_create(
                    student_id=student_id, course_id=course_id,
                    defaults={'is_active': True},
                )
                if not enrollment.is_active:
                    enrollment.is_active = True
                    enrollment.save()

                CourseProgress.objects.get_or_create(
                    student_id=student_id, course_id=course_id,
                    defaults={'progress_percentage': 0},
                )

                logger.info(f"Payment completed: student={student_id}, course={course_id}")

            return Response({'received': True})

        except ImportError:
            return Response(
                {'error': 'Stripe not configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class PaymentHistoryView(generics.ListAPIView):
    """
    GET /api/v1/payments/history/
    Lists payment history for the current user.
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return Payment.objects.filter(
                course__teacher=user
            ).select_related('student', 'course')
        return Payment.objects.filter(
            student=user
        ).select_related('course')
