from django.urls import path
from . import views

app_name = 'enrollments'

urlpatterns = [
    path('enroll/', views.EnrollView.as_view(), name='enroll'),
    path('unenroll/', views.UnenrollView.as_view(), name='unenroll'),
    path('status/<uuid:course_id>/', views.EnrollmentStatusView.as_view(), name='status'),
]
