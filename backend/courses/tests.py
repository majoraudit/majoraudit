from decimal import Decimal

from django.test import TestCase

from .models import Course, CourseCode, CourseInstance, CourseProfessor
from .serializers import CourseSerializer


class CourseOfferingContractTests(TestCase):
    def test_course_list_contract_preserves_term_specific_offerings(self):
        course = Course.objects.create(
            external_id=42,
            title="Linear Algebra",
            description="Current description",
            credits=Decimal("1.0"),
        )
        code = CourseCode.objects.create(department="MATH", number="2250")
        professor_2025 = CourseProfessor.objects.create(external_id=1, name="Professor 2025")
        professor_2026 = CourseProfessor.objects.create(external_id=2, name="Professor 2026")
        fall_2025 = CourseInstance.objects.create(
            course=course, external_id=2503001, year=2025, season="FA", section_num="1"
        )
        fall_2026 = CourseInstance.objects.create(
            course=course, external_id=2603001, year=2026, season="FA", section_num="1"
        )
        for instance, professor in ((fall_2025, professor_2025), (fall_2026, professor_2026)):
            instance.course_codes.add(code)
            instance.course_professors.add(professor)

        offerings = CourseSerializer(course).data["course_instances"]
        self.assertEqual(
            {(item["year"], item["season"], item["course_professors"][0]["name"]) for item in offerings},
            {(2025, "FA", "Professor 2025"), (2026, "FA", "Professor 2026")},
        )
