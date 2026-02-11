"""
Announcement views.
"""
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsTeacher, IsTeacherOrReadOnly
from apps.enrollments.models import Enrollment

from .models import Announcement
from .serializers import AnnouncementCreateSerializer, AnnouncementListSerializer


class AnnouncementListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/announcements/  - List announcements for enrolled courses + global
    POST /api/v1/announcements/  - Create announcement (teacher only)
    """
    permission_classes = [IsAuthenticated, IsTeacherOrReadOnly]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AnnouncementCreateSerializer
        return AnnouncementListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return Announcement.objects.filter(teacher=user).select_related('course')
        else:
            # Students see global + enrolled course announcements
            enrolled_ids = Enrollment.objects.filter(
                student=user, is_active=True
            ).values_list('course_id', flat=True)
            return Announcement.objects.filter(
                Q(course__isnull=True) | Q(course_id__in=enrolled_ids)
            ).select_related('teacher', 'course')

    def create(self, request, *args, **kwargs):
        serializer = AnnouncementCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save()
        return Response({
            'success': True,
            'message': 'Announcement created.',
            'data': AnnouncementListSerializer(announcement).data,
        }, status=status.HTTP_201_CREATED)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/v1/announcements/<id>/"""
    serializer_class = AnnouncementListSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Announcement.objects.select_related('teacher', 'course')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response({'success': True, 'data': AnnouncementListSerializer(instance).data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.teacher != request.user:
            return Response(
                {'success': False, 'error': {'message': 'Only the author can delete.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()
        return Response({'success': True, 'message': 'Announcement deleted.'})
