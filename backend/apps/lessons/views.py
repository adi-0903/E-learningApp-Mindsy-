"""
Lesson views - CRUD, reorder, and course-scoped listing.
"""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsTeacher, IsTeacherOrReadOnly

from .models import Lesson
from .serializers import (
    LessonCreateSerializer,
    LessonDetailSerializer,
    LessonListSerializer,
    LessonUpdateSerializer,
)


class CourseLessonsView(generics.ListCreateAPIView):
    """
    GET  /api/v1/lessons/?course=<id>  - List lessons for a course
    POST /api/v1/lessons/              - Create a lesson (teacher only)
    """
    permission_classes = [IsAuthenticated, IsTeacherOrReadOnly]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LessonCreateSerializer
        return LessonListSerializer

    def get_queryset(self):
        queryset = Lesson.objects.select_related('course').filter(is_deleted=False)
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset.order_by('sequence_number')

    def create(self, request, *args, **kwargs):
        serializer = LessonCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        lesson = serializer.save()
        return Response({
            'success': True,
            'message': 'Lesson created successfully.',
            'data': LessonDetailSerializer(lesson).data,
        }, status=status.HTTP_201_CREATED)


class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/lessons/<id>/  - Get lesson detail
    PUT    /api/v1/lessons/<id>/  - Update lesson (owner teacher)
    DELETE /api/v1/lessons/<id>/  - Soft-delete lesson (owner teacher)
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return LessonUpdateSerializer
        return LessonDetailSerializer

    def get_queryset(self):
        return Lesson.objects.select_related('course', 'course__teacher').filter(is_deleted=False)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = LessonDetailSerializer(instance)
        return Response({'success': True, 'data': serializer.data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.course.teacher != request.user:
            return Response(
                {'success': False, 'error': {'message': 'Only the course teacher can update lessons.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        partial = kwargs.pop('partial', False)
        serializer = LessonUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Lesson updated successfully.',
            'data': LessonDetailSerializer(instance).data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.course.teacher != request.user:
            return Response(
                {'success': False, 'error': {'message': 'Only the course teacher can delete lessons.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.soft_delete()
        return Response({'success': True, 'message': 'Lesson deleted successfully.'})


class ReorderLessonsView(APIView):
    """
    POST /api/v1/lessons/reorder/
    Accepts { "course_id": "...", "order": ["lesson-id-1", "lesson-id-2", ...] }
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        course_id = request.data.get('course_id')
        order = request.data.get('order', [])

        if not course_id or not order:
            return Response(
                {'success': False, 'error': {'message': 'course_id and order are required.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.courses.models import Course
        try:
            course = Course.objects.get(id=course_id, teacher=request.user)
        except Course.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Course not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        for idx, lesson_id in enumerate(order, start=1):
            Lesson.objects.filter(id=lesson_id, course=course).update(sequence_number=idx)

        return Response({'success': True, 'message': 'Lessons reordered successfully.'})
