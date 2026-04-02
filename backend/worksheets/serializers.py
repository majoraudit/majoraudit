from rest_framework import serializers
from .models import UserWorksheet, UserWorksheetSemester, UserWorksheetClass
from courses.models import Course


class InlineCourseSerializer(serializers.ModelSerializer):
    """Minimal course representation matching the frontend Course type."""
    id = serializers.IntegerField(source='external_id')
    credit = serializers.FloatField(source='credits')
    codes = serializers.SerializerMethodField()
    dist = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'title', 'credit', 'codes', 'dist']

    def get_codes(self, obj):
        codes = set()
        for instance in obj.courseinstance_set.all():
            for code in instance.course_codes.all():
                codes.add(f"{code.department} {code.number}")
        return list(codes) if codes else [""]

    def get_dist(self, obj):
        return list(obj.distributionals.values_list('code', flat=True))


class UserWorksheetClassSerializer(serializers.ModelSerializer):
    # Read: full nested course object
    course = InlineCourseSerializer(read_only=True)
    # Write: accept external_id to look up the Course row
    course_id = serializers.SlugRelatedField(
        slug_field='external_id',
        queryset=Course.objects.all(),
        source='course',
        write_only=True,
    )

    class Meta:
        model = UserWorksheetClass
        fields = ['id', 'course', 'course_id', 'creditdf']


class UserWorksheetSemesterSerializer(serializers.ModelSerializer):
    classes = UserWorksheetClassSerializer(
        many=True, read_only=True, source='userworksheetclass_set')

    class Meta:
        model = UserWorksheetSemester
        fields = ['id', 'year', 'season', 'classes']


class UserWorksheetSerializer(serializers.ModelSerializer):
    semesters = UserWorksheetSemesterSerializer(
        many=True, read_only=True, source='userworksheetsemester_set')

    class Meta:
        model = UserWorksheet
        fields = ['id', 'name', 'semesters']
        read_only_fields = ['user']
