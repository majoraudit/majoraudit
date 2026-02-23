from rest_framework import serializers
from .models import Course, CourseInstance, CourseProfessor, CourseCode, CourseTag


class CourseProfessorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseProfessor
        fields = ['name']


class CourseCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseCode
        fields = ['department', 'number']

class CourseTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseTag
        fields = ['name']


class CourseInstanceSerializer(serializers.ModelSerializer):
    course_professors = CourseProfessorSerializer(many=True, read_only=True)
    course_codes = CourseCodeSerializer(many=True, read_only=True)

    class Meta:
        model = CourseInstance
        fields = [
            'external_id',
            'year',
            'season',
            'section_num',
            'course_professors',
            'course_codes'
        ]


class CourseSerializer(serializers.ModelSerializer):
    distributionals = serializers.StringRelatedField(many=True, read_only=True)
    course_codes = serializers.SerializerMethodField()
    course_tags = CourseTagSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [
            'external_id',
            'title',
            'description',
            'credits',
            'distributionals',
            'course_codes',
            'course_tags',
        ]

    def get_course_codes(self, obj):
        codes = set()
        for instance in obj.courseinstance_set.all():
            for code in instance.course_codes.all():
                codes.add(code)

        return CourseCodeSerializer(codes, many=True).data


class CourseDetailSerializer(serializers.ModelSerializer):
    distributionals = serializers.StringRelatedField(many=True, read_only=True)
    course_instances = CourseInstanceSerializer(
        many=True,
        read_only=True,
        source='courseinstance_set'
    )

    class Meta:
        model = Course
        fields = [
            'external_id',
            'title',
            'description',
            'credits',
            'distributionals',
            'course_instances'
        ]
