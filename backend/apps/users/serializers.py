"""
User serializers for authentication, registration, profile management.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token that includes user role and name in claims."""

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Add custom claims
        data['user'] = {
            'id': str(user.id),
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'profile_image': user.profile_image_url,
            'is_email_verified': user.is_email_verified,
        }
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['name'] = user.name
        token['email'] = user.email
        return token


class RegisterSerializer(serializers.ModelSerializer):
    """Handles user registration with password validation."""
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['email', 'name', 'password', 'password_confirm', 'role']

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower()

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        if attrs.get('role') not in ['student', 'teacher']:
            raise serializers.ValidationError({'role': 'Role must be either student or teacher.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Full user profile serializer."""
    profile_image_url = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'role', 'bio', 'phone_number',
            'profile_image', 'profile_image_url',
            'is_email_verified', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_email_verified', 'created_at', 'updated_at']


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    class Meta:
        model = User
        fields = ['name', 'bio', 'phone_number', 'profile_image']

    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters.')
        return value.strip()


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(
        required=True, validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(required=True, style={'input_type': 'password'})

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Passwords do not match.'})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user lists."""
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'profile_image_url']
        read_only_fields = fields


class FCMTokenSerializer(serializers.Serializer):
    """Serializer for updating FCM push notification token."""
    fcm_token = serializers.CharField(required=True, max_length=255)
