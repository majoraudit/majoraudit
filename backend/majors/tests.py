from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from worksheets.models import UserWorksheet, WorksheetMajor
from courses.models import Course, CourseCode, CourseInstance

from .catalog import catalog
from .audit import build_catalog, build_profile


class CatalogContractTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="auditor", class_year=2027)
        self.client.force_authenticate(self.user)

    def test_resolves_manifest_program_to_semantic_program(self):
        asset = catalog.program("2026-2027", "computer_science", "ba")
        self.assertEqual(asset.semantic_program_id, "computer_science_ba")
        self.assertEqual(asset.ir["schema_version"], "0.2.0")

    def test_major_list_is_versioned_and_revision_stamped(self):
        response = self.client.get(reverse("major-list"), secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["api_version"], "2")
        self.assertTrue(response.data["majors_revision"])
        self.assertGreater(len(response.data["majors"]), 0)

    def test_college_program_is_exposed_through_the_same_contract(self):
        response = self.client.get(
            reverse("major-detail", kwargs={"major_id": "general_degree"}),
            secure=True,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["major"]["programs"], ["general_degree"])

        asset = catalog.program("2026-2027", "general_degree", "general_degree")
        self.assertTrue(asset.semantic_program_id)

    def test_empty_completed_transcript_returns_engine_envelope(self):
        worksheet = UserWorksheet.objects.create(user=self.user, name="Main")
        selected = WorksheetMajor.objects.create(
            worksheet=worksheet, catalog_year="2026-2027",
            major_id="computer_science", program_id="ba",
        )
        response = self.client.post(
            reverse("ws-major-audit", kwargs={"worksheet_pk": worksheet.pk, "pk": selected.pk}),
            {}, format="json", secure=True,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["scope"], "completed")
        self.assertEqual(response.data["program"]["semantic_program_id"], "computer_science_ba")
        self.assertEqual(response.data["audit"]["status"], "INCOMPLETE")
        self.assertEqual(response.data["audit"]["alternate_witnesses"], [])

    def test_cannot_audit_another_users_worksheet(self):
        other = get_user_model().objects.create_user(username="other")
        worksheet = UserWorksheet.objects.create(user=other, name="Private")
        selected = WorksheetMajor.objects.create(
            worksheet=worksheet, major_id="computer_science", program_id="ba"
        )
        response = self.client.post(
            reverse("ws-major-audit", kwargs={"worksheet_pk": worksheet.pk, "pk": selected.pk}),
            {}, format="json", secure=True,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_catalog_uses_latest_positive_credit_course_for_reused_code(self):
        code = CourseCode.objects.create(department="BENG", number="3200")
        older = Course.objects.create(
            external_id=100, title="Older", description="", credits=1,
        )
        newer = Course.objects.create(
            external_id=200, title="Newer", description="", credits=1,
        )
        discussion = Course.objects.create(
            external_id=300, title="Discussion", description="", credits=0,
        )
        for course, external_id, year in (
            (older, 1001, 2025), (newer, 2001, 2026), (discussion, 3001, 2027)
        ):
            instance = CourseInstance.objects.create(
                course=course, external_id=external_id, year=year,
                season="FA", section_num="1",
            )
            instance.course_codes.add(code)

        document, _ = build_catalog()
        records = [
            item for item in document["courses"]
            if item["canonical_course_id"] == "BENG3200"
        ]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["credit_units"], 2)

    def test_general_degree_language_choice_defaults_from_user_profile(self):
        self.user.language_requirement = "L5"
        self.user.save(update_fields=["language_requirement"])
        worksheet = UserWorksheet.objects.create(user=self.user, name="Main")
        selected = WorksheetMajor.objects.create(
            worksheet=worksheet,
            catalog_year="2026-2027",
            major_id="general_degree",
            program_id="general_degree",
        )
        asset = catalog.program("2026-2027", "general_degree", "general_degree")

        profile = build_profile(selected, asset)

        self.assertEqual(profile["declared_choices"]["language_start"], "L5")
