from django.contrib import admin
from .models import Course


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'category', 'level', 'is_published', 'student_count', 'created_at')
    list_filter = ('category', 'level', 'is_published', 'is_free')
    search_fields = ('title', 'description', 'teacher__name')
    raw_id_fields = ('teacher',)
    ordering = ('-created_at',)
