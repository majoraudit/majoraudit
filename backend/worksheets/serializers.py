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
        fields = [
            'id', 'course', 'course_instance', 'creditdf', 'grade',
            'grading_mode', 'graduate_grade', 'source', 'enrolled_course_code',
            'year_of_study_override',
        ]

    def validate_grading_mode(self, value):
        allowed = {"letter", "crdf", "pass_fail"}
        if value not in allowed:
            raise serializers.ValidationError(f"must be one of {sorted(allowed)}")
        return value

    def validate_source(self, value):
        allowed = {"yale", "summer", "study_abroad", "transfer", "acceleration"}
        if value not in allowed:
            raise serializers.ValidationError(f"must be one of {sorted(allowed)}")
        return value

    def validate_year_of_study_override(self, value):
        if value is not None and value not in {1, 2, 3, 4}:
            raise serializers.ValidationError("must be between 1 and 4")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        enrolled = attrs.get("enrolled_course_code")
        if enrolled is None:
            return attrs

        instance = attrs.get("course_instance")
        course = attrs.get("course")
        if self.instance is not None:
            instance = instance or self.instance.course_instance
            course = course or self.instance.course

        if instance is not None:
            codes = instance.course_codes.all()
        elif course is not None:
            codes = CourseInstance.objects.filter(course=course).values_list(
                "course_codes__department", "course_codes__number"
            )
            available = {
                f"{department}{number}".replace(" ", "").upper()
                for department, number in codes if department and number
            }
            normalized = enrolled.replace(" ", "").upper()
            if normalized and normalized not in available:
                raise serializers.ValidationError({
                    "enrolled_course_code": "not a code for this course"
                })
            return attrs
        else:
            return attrs

        available = {
            f"{code.department}{code.number}".replace(" ", "").upper()
            for code in codes
        }
        normalized = enrolled.replace(" ", "").upper()
        if normalized and normalized not in available:
            raise serializers.ValidationError({
                "enrolled_course_code": "not a code for this course offering"
            })
        return attrs


class UserWorksheetSemesterSerializer(serializers.ModelSerializer):
    classes = UserWorksheetClassSerializer(
        many=True, read_only=True, source='userworksheetclass_set')

    class Meta:
        model = UserWorksheetSemester
        fields = ['id', 'year', 'season', 'title', 'is_completed', 'classes']


class UserWorksheetSerializer(serializers.ModelSerializer):
    semesters = UserWorksheetSemesterSerializer(
        many=True, read_only=True, source='userworksheetsemester_set')

    class Meta:
        model = UserWorksheet
        fields = ['id', 'name', 'semesters']
        read_only_fields = ['user']
