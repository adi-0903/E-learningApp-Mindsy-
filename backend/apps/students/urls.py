from django.urls import path
from . import views

app_name = 'students'

urlpatterns = [
    path('dashboard/', views.StudentDashboardView.as_view(), name='dashboard'),
    path('courses/', views.StudentEnrolledCoursesView.as_view(), name='enrolled-courses'),
    path('browse/', views.StudentBrowseCoursesView.as_view(), name='browse-courses'),
    path('progress/', views.StudentProgressView.as_view(), name='progress'),
    path('quiz-history/', views.StudentQuizHistoryView.as_view(), name='quiz-history'),
]
