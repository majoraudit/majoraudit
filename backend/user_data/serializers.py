from rest_framework import serializers
from .models import UserInfo, UserMajor


class UserInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserInfo
        fields = [
            'id',
            'class_year',
            'language_requirement',
            'intended_major_id',
            'intended_language_code',
        ]
        read_only_fields = ['id']


class UserMajorSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMajor
        fields = ['id', 'major_id', 'specialization', 'added_at']
        read_only_fields = ['id', 'added_at']