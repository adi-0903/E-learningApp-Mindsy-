from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'student', 'student_name', 'course', 'course_title',
            'amount', 'currency', 'status', 'payment_method',
            'receipt_url', 'created_at',
        ]
        read_only_fields = fields


class CreateCheckoutSerializer(serializers.Serializer):
    """Input for creating a Stripe checkout session."""
    course_id = serializers.UUIDField()
