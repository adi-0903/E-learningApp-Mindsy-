from rest_framework import serializers
from .models import LiveClass, LiveClassChat, LiveClassParticipant


class LiveClassListSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True, default=None)
    participant_count = serializers.ReadOnlyField()

    class Meta:
        model = LiveClass
        fields = [
            'id', 'title', 'description', 'teacher_name', 'course', 'course_title',
            'scheduled_at', 'status', 'max_participants', 'participant_count', 'created_at',
        ]


class LiveClassDetailSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True, default=None)
    participant_count = serializers.ReadOnlyField()

    class Meta:
        model = LiveClass
        fields = [
            'id', 'title', 'description', 'teacher', 'teacher_name',
            'course', 'course_title', 'scheduled_at', 'started_at', 'ended_at',
            'status', 'max_participants', 'participant_count',
            'channel_name', 'recording_url', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'teacher', 'channel_name', 'created_at', 'updated_at']


class LiveClassCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveClass
        fields = ['title', 'description', 'course', 'scheduled_at', 'max_participants']

    def create(self, validated_data):
        import shortuuid
        validated_data['teacher'] = self.context['request'].user
        validated_data['channel_name'] = f"mentiq-{shortuuid.uuid()[:12]}"
        return super().create(validated_data)


class LiveClassParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = LiveClassParticipant
        fields = ['id', 'user', 'user_name', 'user_role', 'joined_at', 'left_at']


class LiveClassChatSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = LiveClassChat
        fields = ['id', 'user', 'user_name', 'message', 'timestamp']
        read_only_fields = ['id', 'user', 'timestamp']


class JoinLiveClassSerializer(serializers.Serializer):
    """Returns Jitsi connection details."""
    room_name = serializers.CharField(read_only=True)
    jitsi_domain = serializers.CharField(read_only=True)
    meeting_url = serializers.CharField(read_only=True)
    is_class_host = serializers.BooleanField(read_only=True)
