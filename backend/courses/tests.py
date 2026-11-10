from decimal import Decimal

from django.test import TestCase

from .models import Course, CourseCode, CourseInstance, CourseProfessor
from .serializers import CourseSerializer
from .management.commands.fetch_courses import distribution_codes, normalize_distribution_code


class DistributionCodeTests(TestCase):
    def test_normalizes_coursetable_codes_to_rfc_spelling(self):
        self.assertEqual(normalize_distribution_code("Hu"), "Hu")
        self.assertEqual(normalize_distribution_code("HU"), "Hu")
        self.assertEqual(normalize_distribution_code("so"), "So")
        self.assertEqual(normalize_distribution_code("SC"), "Sc")
        self.assertEqual(normalize_distribution_code("qr"), "QR")
        self.assertEqual(normalize_distribution_code("L5"), "L5")

    def test_ignores_non_distribution_course_skills(self):
        self.assertIsNone(normalize_distribution_code("First-year seminar"))

    def test_combines_area_and_skill_distributions(self):
        self.assertEqual(
            distribution_codes({"areas": ["So"], "skills": ["QR"]}),
            ["QR", "So"],
        )


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
