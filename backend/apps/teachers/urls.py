from django.urls import path
from . import views

app_name = 'teachers'

urlpatterns = [
    path('dashboard/', views.TeacherDashboardView.as_view(), name='dashboard'),
    path('courses/', views.TeacherCoursesView.as_view(), name='courses'),
    path('students/', views.TeacherStudentsView.as_view(), name='students'),
    path('courses/<uuid:course_id>/students/', views.TeacherCourseStudentsView.as_view(), name='course-students'),
]
