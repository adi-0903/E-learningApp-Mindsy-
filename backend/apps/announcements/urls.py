from django.urls import path
from . import views

app_name = 'announcements'

urlpatterns = [
    path('', views.AnnouncementListCreateView.as_view(), name='list-create'),
    path('<uuid:id>/', views.AnnouncementDetailView.as_view(), name='detail'),
]
