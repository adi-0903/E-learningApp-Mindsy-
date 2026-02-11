from django.contrib import admin
from .models import Quiz, QuizAttempt, QuizQuestion

class QuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 1

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'question_count', 'duration', 'passing_score', 'is_published')
    list_filter = ('is_published', 'course__category')
    search_fields = ('title', 'course__title')
    inlines = [QuestionInline]

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('student', 'quiz', 'score', 'total_questions', 'percentage', 'passed', 'completed_at')
    list_filter = ('quiz__course',)
    search_fields = ('student__name', 'quiz__title')
