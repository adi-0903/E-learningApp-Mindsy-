from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'amount', 'currency', 'status', 'payment_method', 'created_at')
    list_filter = ('status', 'payment_method', 'currency')
    search_fields = ('student__name', 'course__title', 'stripe_payment_intent_id')
    readonly_fields = ('stripe_payment_intent_id', 'stripe_charge_id')
