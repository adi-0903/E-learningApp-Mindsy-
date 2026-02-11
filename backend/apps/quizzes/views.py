"""
Quiz views - CRUD for quizzes/questions, submit/grade, results.
"""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsStudent, IsTeacher, IsTeacherOrReadOnly

from .models import Quiz, QuizAttempt, QuizQuestion
from .serializers import (
    QuizAttemptDetailSerializer,
    QuizAttemptSerializer,
    QuizCreateSerializer,
    QuizDetailSerializer,
    QuizListSerializer,
    QuizQuestionCreateSerializer,
    QuizSubmitSerializer,
)


class QuizListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/quizzes/?course=<id>  - List quizzes for a course
    POST /api/v1/quizzes/              - Create quiz with questions (teacher only)
    """
    permission_classes = [IsAuthenticated, IsTeacherOrReadOnly]
    pagination_class = StandardPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return QuizCreateSerializer
        return QuizListSerializer

    def get_queryset(self):
        queryset = Quiz.objects.select_related('course')
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        # Students see only published quizzes
        if self.request.user.role == 'student':
            queryset = queryset.filter(is_published=True)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = QuizCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        quiz = serializer.save()
        return Response({
            'success': True,
            'message': 'Quiz created successfully.',
            'data': QuizDetailSerializer(quiz).data,
        }, status=status.HTTP_201_CREATED)


class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/quizzes/<id>/  - Get quiz with questions
    PUT    /api/v1/quizzes/<id>/  - Update quiz (owner teacher)
    DELETE /api/v1/quizzes/<id>/  - Delete quiz (owner teacher)
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_serializer_class(self):
        return QuizDetailSerializer

    def get_queryset(self):
        return Quiz.objects.prefetch_related('questions').select_related('course')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = QuizDetailSerializer(instance)
        return Response({'success': True, 'data': serializer.data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.course.teacher != request.user:
            return Response(
                {'success': False, 'error': {'message': 'Only the course teacher can update quizzes.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = QuizCreateSerializer(instance, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Quiz updated successfully.',
            'data': QuizDetailSerializer(instance).data,
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.course.teacher != request.user:
            return Response(
                {'success': False, 'error': {'message': 'Only the course teacher can delete quizzes.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()
        return Response({'success': True, 'message': 'Quiz deleted successfully.'})


class QuizQuestionManageView(APIView):
    """
    POST /api/v1/quizzes/<quiz_id>/questions/
    Add a question to a quiz (teacher only).
    """
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, quiz_id):
        try:
            quiz = Quiz.objects.get(id=quiz_id, course__teacher=request.user)
        except Quiz.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Quiz not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data.copy()
        data['quiz'] = quiz.id
        serializer = QuizQuestionCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Question added successfully.',
            'data': serializer.data,
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, quiz_id):
        """Delete a specific question by passing question_id in query."""
        question_id = request.query_params.get('question_id')
        if not question_id:
            return Response(
                {'success': False, 'error': {'message': 'question_id is required.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            question = QuizQuestion.objects.get(
                id=question_id, quiz_id=quiz_id, quiz__course__teacher=request.user
            )
        except QuizQuestion.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Question not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        question.delete()
        return Response({'success': True, 'message': 'Question deleted successfully.'})


class QuizSubmitView(APIView):
    """
    POST /api/v1/quizzes/<quiz_id>/submit/
    Student submits answers; server grades and returns result.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, quiz_id):
        try:
            quiz = Quiz.objects.prefetch_related('questions').get(id=quiz_id, is_published=True)
        except Quiz.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': 'Quiz not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check max attempts
        if quiz.max_attempts > 0:
            attempt_count = QuizAttempt.objects.filter(student=request.user, quiz=quiz).count()
            if attempt_count >= quiz.max_attempts:
                return Response(
                    {'success': False, 'error': {'message': f'Maximum attempts ({quiz.max_attempts}) reached.'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submitted_answers = serializer.validated_data['answers']
        time_taken = serializer.validated_data.get('time_taken', 0)

        # Grade the quiz
        questions = quiz.questions.all()
        total = questions.count()
        score = 0

        for question in questions:
            submitted = submitted_answers.get(str(question.id), '').lower()
            if submitted == question.correct_answer.lower():
                score += 1

        # Save attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=request.user,
            score=score,
            total_questions=total,
            answers=submitted_answers,
            time_taken=time_taken,
        )

        return Response({
            'success': True,
            'message': 'Quiz submitted successfully.',
            'data': QuizAttemptDetailSerializer(attempt).data,
        }, status=status.HTTP_201_CREATED)


class QuizAttemptsView(generics.ListAPIView):
    """
    GET /api/v1/quizzes/<quiz_id>/attempts/
    Teacher: see all attempts. Student: see own attempts.
    """
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        quiz_id = self.kwargs['quiz_id']
        user = self.request.user
        queryset = QuizAttempt.objects.filter(quiz_id=quiz_id).select_related('quiz')

        if user.role == 'student':
            queryset = queryset.filter(student=user)

        return queryset.order_by('-completed_at')
