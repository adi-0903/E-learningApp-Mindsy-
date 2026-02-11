"""
Course views - CRUD operations for courses.
Teachers can create/update/delete. Students can read published courses.
"""
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsCourseTeacher, IsTeacher, IsTeacherOrReadOnly

from .models import Course
from .serializers import (
    CourseCreateSerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CourseUpdateSerializer,
)


class CourseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/courses/         - List published courses (all authenticated users)
    POST /api/v1/courses/         - Create a course (teachers only)
    """
    permission_classes = [IsAuthenticated, IsTeacherOrReadOnly]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CourseCreateSerializer
        return CourseListSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Course.objects.select_related('teacher')

        # Teachers see their own courses, students see published ones only
        if user.role == 'teacher':
            queryset = queryset.filter(
                Q(teacher=user) | Q(is_published=True),
                is_deleted=False,
            )
        else:
            queryset = queryset.filter(is_published=True, is_deleted=False)

        # Search
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        # Filter
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        level = self.request.query_params.get('level')
        if level:
            queryset = queryset.filter(level=level)

        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = CourseCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response({
            'success': True,
            'message': 'Course created successfully.',
            'data': CourseDetailSerializer(course).data,
        }, status=status.HTTP_201_CREATED)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/courses/<id>/  - Get course detail
    PUT    /api/v1/courses/<id>/  - Update course (owner teacher only)
    DELETE /api/v1/courses/<id>/  - Soft-delete course (owner teacher only)
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return CourseUpdateSerializer
        return CourseDetailSerializer

    def get_queryset(self):
        return Course.objects.select_related('teacher').filter(is_deleted=False)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = CourseDetailSerializer(instance)
        return Response({'success': True, 'data': serializer.data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.teacher != request.user:
            return Response(
                {'success': False, 'error': {'message': 'Only the course teacher can update this course.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = kwargs.pop('partial', False)
        serializer = CourseUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Course updated successfully.',
            'data': CourseDetailSerializer(instance).data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.teacher != request.user:
            return Response(
                {'success': False, 'error': {'message': 'Only the course teacher can delete this course.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.soft_delete()
        return Response({
            'success': True,
            'message': 'Course deleted successfully.',
        }, status=status.HTTP_200_OK)
