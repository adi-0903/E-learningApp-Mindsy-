from django.contrib import admin
from .models import Lesson

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'sequence_number', 'file_type', 'duration', 'created_at')
    list_filter = ('file_type', 'course__category')
    search_fields = ('title', 'course__title')
    ordering = ('course', 'sequence_number')
