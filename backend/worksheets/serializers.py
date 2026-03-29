from rest_framework import serializers
from .models import UserWorksheet, UserWorksheetSemester, UserWorksheetClass
from courses.models import Course, CourseInstance


class UserWorksheetClassSerializer(serializers.ModelSerializer):
    course = serializers.SlugRelatedField(
        slug_field='external_id',
        queryset=Course.objects.all(),
        allow_null=True,
        required=False
    )
    course_instance = serializers.SlugRelatedField(
        slug_field='external_id',
        queryset=CourseInstance.objects.all(),
        allow_null=True,
        required=False
    )

    class Meta:
        model = UserWorksheetClass
        fields = ['id', 'course', 'course_instance', 'creditdf']


class UserWorksheetSemesterSerializer(serializers.ModelSerializer):
    classes = UserWorksheetClassSerializer(
        many=True, read_only=True, source='userworksheetclass_set')

    class Meta:
        model = UserWorksheetSemester
        fields = ['id', 'year', 'season', 'title', 'classes']


class UserWorksheetSerializer(serializers.ModelSerializer):
    semesters = UserWorksheetSemesterSerializer(
        many=True, read_only=True, source='userworksheetsemester_set')

    class Meta:
        model = UserWorksheet
        fields = ['id', 'name', 'semesters']
        read_only_fields = ['user']