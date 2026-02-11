from django.urls import path
from . import views

app_name = 'quizzes'

urlpatterns = [
    path('', views.QuizListCreateView.as_view(), name='list-create'),
    path('<uuid:id>/', views.QuizDetailView.as_view(), name='detail'),
    path('<uuid:quiz_id>/questions/', views.QuizQuestionManageView.as_view(), name='questions'),
    path('<uuid:quiz_id>/submit/', views.QuizSubmitView.as_view(), name='submit'),
    path('<uuid:quiz_id>/attempts/', views.QuizAttemptsView.as_view(), name='attempts'),
]
