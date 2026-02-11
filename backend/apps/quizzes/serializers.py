"""
Quiz serializers.
"""
from rest_framework import serializers
from .models import Quiz, QuizAttempt, QuizQuestion


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Question with options (hides correct answer for students)."""
    options = serializers.ReadOnlyField()

    class Meta:
        model = QuizQuestion
        fields = [
            'id', 'question_text', 'option_a', 'option_b',
            'option_c', 'option_d', 'sequence_number', 'options',
        ]


class QuizQuestionWithAnswerSerializer(serializers.ModelSerializer):
    """Question with correct answer and explanation (for teachers and results)."""
    options = serializers.ReadOnlyField()

    class Meta:
        model = QuizQuestion
        fields = [
            'id', 'question_text', 'option_a', 'option_b',
            'option_c', 'option_d', 'correct_answer',
            'sequence_number', 'explanation', 'options',
        ]


class QuizQuestionCreateSerializer(serializers.ModelSerializer):
    """Create/update a quiz question."""
    class Meta:
        model = QuizQuestion
        fields = [
            'quiz', 'question_text', 'option_a', 'option_b',
            'option_c', 'option_d', 'correct_answer',
            'sequence_number', 'explanation',
        ]


class QuizListSerializer(serializers.ModelSerializer):
    """Quiz listing with basic info."""
    course_title = serializers.CharField(source='course.title', read_only=True)
    question_count = serializers.ReadOnlyField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'course', 'course_title',
            'duration', 'passing_score', 'is_published',
            'question_count', 'max_attempts', 'created_at',
        ]


class QuizDetailSerializer(serializers.ModelSerializer):
    """Full quiz with questions (for taking the quiz)."""
    course_title = serializers.CharField(source='course.title', read_only=True)
    questions = QuizQuestionSerializer(many=True, read_only=True)
    question_count = serializers.ReadOnlyField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'course', 'course_title',
            'duration', 'passing_score', 'is_published',
            'question_count', 'max_attempts', 'questions',
            'created_at', 'updated_at',
        ]


class QuizCreateSerializer(serializers.ModelSerializer):
    """Create a quiz."""
    questions = QuizQuestionCreateSerializer(many=True, required=False)

    class Meta:
        model = Quiz
        fields = [
            'course', 'title', 'description', 'duration',
            'passing_score', 'is_published', 'max_attempts', 'questions',
        ]

    def validate(self, attrs):
        course = attrs.get('course')
        request = self.context.get('request')
        if request and course.teacher != request.user:
            raise serializers.ValidationError('You can only add quizzes to your own courses.')
        return attrs

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        for q_data in questions_data:
            q_data['quiz'] = quiz
            QuizQuestion.objects.create(**q_data)
        return quiz


class QuizSubmitSerializer(serializers.Serializer):
    """Submit quiz answers for grading."""
    answers = serializers.DictField(
        child=serializers.CharField(),
        help_text='{"question_id": "selected_answer_letter"}',
    )
    time_taken = serializers.IntegerField(required=False, default=0)


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Quiz attempt result."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    percentage = serializers.ReadOnlyField()
    passed = serializers.ReadOnlyField()

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'score', 'total_questions',
            'percentage', 'passed', 'time_taken', 'completed_at',
        ]


class QuizAttemptDetailSerializer(serializers.ModelSerializer):
    """Detailed attempt with answers and correct answers."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    percentage = serializers.ReadOnlyField()
    passed = serializers.ReadOnlyField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'score', 'total_questions',
            'percentage', 'passed', 'answers', 'time_taken',
            'completed_at', 'questions',
        ]

    def get_questions(self, obj):
        questions = obj.quiz.questions.all()
        return QuizQuestionWithAnswerSerializer(questions, many=True).data
