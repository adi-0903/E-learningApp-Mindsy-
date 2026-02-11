from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    path('checkout/', views.CreateCheckoutView.as_view(), name='checkout'),
    path('webhook/', views.StripeWebhookView.as_view(), name='webhook'),
    path('history/', views.PaymentHistoryView.as_view(), name='history'),
]
