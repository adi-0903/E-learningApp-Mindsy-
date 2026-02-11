from django.contrib import admin
from .models import CourseAnalytics, DailyAnalytics

@admin.register(DailyAnalytics)
class DailyAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('date', 'total_users', 'total_courses', 'total_enrollments', 'total_revenue')
    ordering = ('-date',)

@admin.register(CourseAnalytics)
class CourseAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('course', 'date', 'enrollments', 'completions', 'avg_progress', 'revenue')
    list_filter = ('date',)
    ordering = ('-date',)
