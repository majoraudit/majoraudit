from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import UserWorksheet, UserWorksheetSemester, UserWorksheetClass, WorksheetMajor
from courses.models import Course

# Create your tests here.

User = get_user_model()


class WorksheetPermissionTests(APITestCase):
    """Test permissions for UserWorksheet endpoints."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1', password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2', password='testpass123'
        )
        self.user1_worksheet = UserWorksheet.objects.create(
            user=self.user1, name='User1 Worksheet'
        )
        self.user2_worksheet = UserWorksheet.objects.create(
            user=self.user2, name='User2 Worksheet'
        )

    def test_unauthenticated_cannot_list_worksheets(self):
        url = reverse('worksheet-list')
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_worksheet(self):
        url = reverse('worksheet-list')
        response = self.client.post(url, {'name': 'New Worksheet'}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_list_own_worksheets(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-list')
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'User1 Worksheet')

    def test_user_cannot_see_other_users_worksheets_in_list(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-list')
        response = self.client.get(url, secure=True)
        worksheet_names = [w['name'] for w in response.data]
        self.assertNotIn('User2 Worksheet', worksheet_names)

    def test_user_can_create_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-list')
        response = self.client.post(url, {'name': 'My New Worksheet'}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            UserWorksheet.objects.filter(
                user=self.user1, name='My New Worksheet'
            ).exists()
        )

    def test_user_can_retrieve_own_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-detail', kwargs={'pk': self.user1_worksheet.pk})
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'User1 Worksheet')

    def test_user_cannot_retrieve_other_users_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-detail', kwargs={'pk': self.user2_worksheet.pk})
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_update_own_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-detail', kwargs={'pk': self.user1_worksheet.pk})
        response = self.client.patch(url, {'name': 'Updated Name'}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1_worksheet.refresh_from_db()
        self.assertEqual(self.user1_worksheet.name, 'Updated Name')

    def test_user_cannot_update_other_users_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-detail', kwargs={'pk': self.user2_worksheet.pk})
        response = self.client.patch(url, {'name': 'Hacked Name'}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.user2_worksheet.refresh_from_db()
        self.assertEqual(self.user2_worksheet.name, 'User2 Worksheet')

    def test_user_can_delete_own_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-detail', kwargs={'pk': self.user1_worksheet.pk})
        response = self.client.delete(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            UserWorksheet.objects.filter(pk=self.user1_worksheet.pk).exists()
        )

    def test_user_cannot_delete_other_users_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('worksheet-detail', kwargs={'pk': self.user2_worksheet.pk})
        response = self.client.delete(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            UserWorksheet.objects.filter(pk=self.user2_worksheet.pk).exists()
        )


class SemesterPermissionTests(APITestCase):
    """Test permissions for UserWorksheetSemester endpoints."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1', password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2', password='testpass123'
        )
        self.user1_worksheet = UserWorksheet.objects.create(
            user=self.user1, name='User1 Worksheet'
        )
        self.user2_worksheet = UserWorksheet.objects.create(
            user=self.user2, name='User2 Worksheet'
        )
        self.user1_semester = UserWorksheetSemester.objects.create(
            worksheet=self.user1_worksheet, year=2024, season='FA'
        )
        self.user2_semester = UserWorksheetSemester.objects.create(
            worksheet=self.user2_worksheet, year=2024, season='SP'
        )

    def test_unauthenticated_cannot_list_semesters(self):
        url = reverse('semester-list', kwargs={'worksheet_pk': self.user1_worksheet.pk})
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_list_semesters_in_own_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-list', kwargs={'worksheet_pk': self.user1_worksheet.pk})
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['year'], 2024)

    def test_user_cannot_list_semesters_in_other_users_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-list', kwargs={'worksheet_pk': self.user2_worksheet.pk})
        response = self.client.get(url, secure=True)
        # Should return empty list since queryset filters by user
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_user_can_create_semester_in_own_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-list', kwargs={'worksheet_pk': self.user1_worksheet.pk})
        response = self.client.post(url, {'year': 2025, 'season': 'SP'}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            UserWorksheetSemester.objects.filter(
                worksheet=self.user1_worksheet, year=2025, season='SP'
            ).exists()
        )

    def test_user_cannot_create_semester_in_other_users_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-list', kwargs={'worksheet_pk': self.user2_worksheet.pk})
        response = self.client.post(url, {'year': 2025, 'season': 'SP'}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(
            UserWorksheetSemester.objects.filter(
                worksheet=self.user2_worksheet, year=2025, season='SP'
            ).exists()
        )

    def test_user_can_retrieve_own_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'pk': self.user1_semester.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['year'], 2024)

    def test_user_cannot_retrieve_other_users_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'pk': self.user2_semester.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_retrieve_semester_via_wrong_worksheet(self):
        """User1 tries to access their own semester but through user2's worksheet URL."""
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'pk': self.user1_semester.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_update_own_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'pk': self.user1_semester.pk
        })
        response = self.client.patch(url, {'year': 2026}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1_semester.refresh_from_db()
        self.assertEqual(self.user1_semester.year, 2026)

    def test_user_cannot_update_other_users_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'pk': self.user2_semester.pk
        })
        response = self.client.patch(url, {'year': 2026}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.user2_semester.refresh_from_db()
        self.assertEqual(self.user2_semester.year, 2024)

    def test_user_can_delete_own_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'pk': self.user1_semester.pk
        })
        response = self.client.delete(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            UserWorksheetSemester.objects.filter(pk=self.user1_semester.pk).exists()
        )

    def test_user_cannot_delete_other_users_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'pk': self.user2_semester.pk
        })
        response = self.client.delete(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            UserWorksheetSemester.objects.filter(pk=self.user2_semester.pk).exists()
        )


class ClassPermissionTests(APITestCase):
    """Test permissions for UserWorksheetClass endpoints."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1', password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2', password='testpass123'
        )
        self.user1_worksheet = UserWorksheet.objects.create(
            user=self.user1, name='User1 Worksheet'
        )
        self.user2_worksheet = UserWorksheet.objects.create(
            user=self.user2, name='User2 Worksheet'
        )
        self.user1_semester = UserWorksheetSemester.objects.create(
            worksheet=self.user1_worksheet, year=2024, season='FA'
        )
        self.user2_semester = UserWorksheetSemester.objects.create(
            worksheet=self.user2_worksheet, year=2024, season='SP'
        )
        # Create a course for testing
        self.course = Course.objects.create(
            external_id=12345,
            title='Test Course',
            description='A test course',
            credits=1.0
        )
        self.user1_class = UserWorksheetClass.objects.create(
            worksheet_semester=self.user1_semester,
            course=self.course,
            creditdf=False
        )
        self.user2_class = UserWorksheetClass.objects.create(
            worksheet_semester=self.user2_semester,
            course=self.course,
            creditdf=False
        )

    def test_unauthenticated_cannot_list_classes(self):
        url = reverse('semester-class-list', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'semester_pk': self.user1_semester.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_list_classes_in_own_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-list', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'semester_pk': self.user1_semester.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_user_cannot_list_classes_in_other_users_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-list', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'semester_pk': self.user2_semester.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_user_can_create_class_in_own_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-list', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'semester_pk': self.user1_semester.pk
        })
        response = self.client.post(url, {
            'course': self.course.external_id,
            'creditdf': True
        }, secure=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_create_class_in_other_users_semester(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-list', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'semester_pk': self.user2_semester.pk
        })
        response = self.client.post(url, {
            'course': self.course.external_id,
            'creditdf': True
        }, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_retrieve_own_class(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'semester_pk': self.user1_semester.pk,
            'pk': self.user1_class.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_cannot_retrieve_other_users_class(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'semester_pk': self.user2_semester.pk,
            'pk': self.user2_class.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_update_own_class(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'semester_pk': self.user1_semester.pk,
            'pk': self.user1_class.pk
        })
        response = self.client.patch(url, {'creditdf': True}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1_class.refresh_from_db()
        self.assertTrue(self.user1_class.creditdf)

    def test_user_cannot_update_other_users_class(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'semester_pk': self.user2_semester.pk,
            'pk': self.user2_class.pk
        })
        response = self.client.patch(url, {'creditdf': True}, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.user2_class.refresh_from_db()
        self.assertFalse(self.user2_class.creditdf)

    def test_user_can_delete_own_class(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'semester_pk': self.user1_semester.pk,
            'pk': self.user1_class.pk
        })
        response = self.client.delete(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            UserWorksheetClass.objects.filter(pk=self.user1_class.pk).exists()
        )

    def test_user_cannot_delete_other_users_class(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'semester_pk': self.user2_semester.pk,
            'pk': self.user2_class.pk
        })
        response = self.client.delete(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            UserWorksheetClass.objects.filter(pk=self.user2_class.pk).exists()
        )

    def test_user_cannot_access_class_via_wrong_semester(self):
        """User1 tries to access their class but through the wrong semester URL."""
        # Create another semester for user1
        other_semester = UserWorksheetSemester.objects.create(
            worksheet=self.user1_worksheet, year=2025, season='SP'
        )
        self.client.force_authenticate(user=self.user1)
        url = reverse('semester-class-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'semester_pk': other_semester.pk,
            'pk': self.user1_class.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class WorksheetMajorPermissionTests(APITestCase):
    """Test permissions for WorksheetMajor endpoints."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1', password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2', password='testpass123'
        )
        self.user1_worksheet = UserWorksheet.objects.create(
            user=self.user1, name='User1 Worksheet'
        )
        self.user2_worksheet = UserWorksheet.objects.create(
            user=self.user2, name='User2 Worksheet'
        )
        self.user1_major = WorksheetMajor.objects.create(
            worksheet=self.user1_worksheet,
            major_id='computer_science',
            specialization='computer_science_ba',
        )
        self.user2_major = WorksheetMajor.objects.create(
            worksheet=self.user2_worksheet,
            major_id='mathematics',
            specialization='mathematics_ba',
        )

    def test_unauthenticated_cannot_list_majors(self):
        url = reverse('ws-major-list', kwargs={
            'worksheet_pk': self.user1_worksheet.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_list_majors_in_own_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-list', kwargs={
            'worksheet_pk': self.user1_worksheet.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['major_id'], 'computer_science')

    def test_user_cannot_list_majors_in_other_users_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-list', kwargs={
            'worksheet_pk': self.user2_worksheet.pk
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_user_can_add_major_to_own_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-list', kwargs={
            'worksheet_pk': self.user1_worksheet.pk
        })
        response = self.client.post(url, {
            'major_id': 'economics',
            'specialization': 'economics_ba',
        }, format='json', secure=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            WorksheetMajor.objects.filter(
                worksheet=self.user1_worksheet,
                major_id='economics',
            ).exists()
        )

    def test_user_cannot_add_major_to_other_users_worksheet(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-list', kwargs={
            'worksheet_pk': self.user2_worksheet.pk
        })
        response = self.client.post(url, {
            'major_id': 'economics',
            'specialization': 'economics_ba',
        }, format='json', secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_add_duplicate_major(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-list', kwargs={
            'worksheet_pk': self.user1_worksheet.pk
        })
        response = self.client.post(url, {
            'major_id': 'computer_science',
            'specialization': 'computer_science_ba',
        }, format='json', secure=True)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_add_same_major_different_specialization(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-list', kwargs={
            'worksheet_pk': self.user1_worksheet.pk
        })
        response = self.client.post(url, {
            'major_id': 'computer_science',
            'specialization': 'computer_science_bs',
        }, format='json', secure=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            WorksheetMajor.objects.filter(
                worksheet=self.user1_worksheet,
                major_id='computer_science',
            ).count(),
            2,
        )

    def test_user_can_retrieve_own_major(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'pk': self.user1_major.pk,
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['major_id'], 'computer_science')

    def test_user_cannot_retrieve_other_users_major(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'pk': self.user2_major.pk,
        })
        response = self.client.get(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_delete_own_major(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-detail', kwargs={
            'worksheet_pk': self.user1_worksheet.pk,
            'pk': self.user1_major.pk,
        })
        response = self.client.delete(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            WorksheetMajor.objects.filter(pk=self.user1_major.pk).exists()
        )

    def test_user_cannot_delete_other_users_major(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('ws-major-detail', kwargs={
            'worksheet_pk': self.user2_worksheet.pk,
            'pk': self.user2_major.pk,
        })
        response = self.client.delete(url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            WorksheetMajor.objects.filter(pk=self.user2_major.pk).exists()
        )