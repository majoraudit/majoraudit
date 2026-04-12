from rest_framework import serializers

from .models import CustomUser


class ProfileSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='username', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'class_year',
            'intended_language_code',
            'language_requirement',
        ]
        read_only_fields = ['id', 'email', 'first_name', 'last_name']
