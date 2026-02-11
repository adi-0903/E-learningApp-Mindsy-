from django.contrib import admin
from .models import CourseProgress, LessonProgress

@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ('student', 'lesson', 'completed', 'completed_at', 'time_spent')
    list_filter = ('completed',)
    search_fields = ('student__name', 'lesson__title')

@admin.register(CourseProgress)
class CourseProgressAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'progress_percentage', 'updated_at')
    search_fields = ('student__name', 'course__title')
