from django.contrib import admin
from .models import LiveClass, LiveClassParticipant

@admin.register(LiveClass)
class LiveClassAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'status', 'scheduled_at', 'participant_count')
    list_filter = ('status',)
    search_fields = ('title', 'teacher__name')

@admin.register(LiveClassParticipant)
class LiveClassParticipantAdmin(admin.ModelAdmin):
    list_display = ('user', 'live_class', 'joined_at', 'left_at')
