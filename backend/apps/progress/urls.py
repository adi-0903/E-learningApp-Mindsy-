from django.urls import path
from . import views

app_name = 'progress'

urlpatterns = [
    path('complete/', views.MarkLessonCompleteView.as_view(), name='mark-complete'),
    path('course/<uuid:course_id>/', views.CourseProgressView.as_view(), name='course-progress'),
]
