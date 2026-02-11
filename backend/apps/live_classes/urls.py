from django.urls import path
from . import views

app_name = 'live_classes'

urlpatterns = [
    path('', views.LiveClassListCreateView.as_view(), name='list-create'),
    path('<uuid:id>/', views.LiveClassDetailView.as_view(), name='detail'),
    path('<uuid:id>/start/', views.StartLiveClassView.as_view(), name='start'),
    path('<uuid:id>/end/', views.EndLiveClassView.as_view(), name='end'),
    path('<uuid:id>/join/', views.JoinLiveClassView.as_view(), name='join'),
    path('<uuid:id>/leave/', views.LeaveLiveClassView.as_view(), name='leave'),
    path('<uuid:id>/participants/', views.LiveClassParticipantsView.as_view(), name='participants'),
    path('<uuid:id>/chat/', views.LiveClassChatView.as_view(), name='chat'),
]
