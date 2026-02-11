from django.urls import path
from . import views

app_name = 'lessons'

urlpatterns = [
    path('', views.CourseLessonsView.as_view(), name='list-create'),
    path('<uuid:id>/', views.LessonDetailView.as_view(), name='detail'),
    path('reorder/', views.ReorderLessonsView.as_view(), name='reorder'),
]
