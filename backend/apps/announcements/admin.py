from django.contrib import admin
from .models import Announcement

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'course', 'priority', 'is_pinned', 'created_at')
    list_filter = ('priority', 'is_pinned')
    search_fields = ('title', 'content')
