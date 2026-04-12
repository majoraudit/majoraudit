from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class ProfileTests(APITestCase):
    """Test the GET/PATCH profile endpoint at /api/auth/profile/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            first_name='Alice',
            last_name='Smith',
            email='alice@example.com',
        )
        self.url = reverse('profile')

    def test_unauthenticated_cannot_get_profile(self):
        response = self.client.get(self.url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_get_profile(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url, secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], 'testuser')
        self.assertEqual(response.data['first_name'], 'Alice')
        self.assertEqual(response.data['last_name'], 'Smith')
        self.assertEqual(response.data['email'], 'alice@example.com')

    def test_profile_contains_all_expected_fields(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url, secure=True)
        expected_fields = {
            'id', 'email', 'first_name', 'last_name',
            'class_year', 'intended_language_code', 'language_requirement',
        }
        self.assertEqual(set(response.data.keys()), expected_fields)

    def test_user_can_patch_class_year(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url, {'class_year': 2027}, format='json', secure=True,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['class_year'], 2027)
        self.user.refresh_from_db()
        self.assertEqual(self.user.class_year, 2027)

    def test_user_can_patch_language_fields(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(self.url, {
            'intended_language_code': 'CHNS',
            'language_requirement': 'L4',
        }, format='json', secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.intended_language_code, 'CHNS')
        self.assertEqual(self.user.language_requirement, 'L4')

    def test_user_cannot_patch_read_only_fields(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(self.url, {
            'email': 'hacker@evil.com',
            'first_name': 'Hacked',
            'last_name': 'Name',
        }, format='json', secure=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'alice@example.com')
        self.assertEqual(self.user.first_name, 'Alice')
        self.assertEqual(self.user.last_name, 'Smith')

    def test_put_not_allowed(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(self.url, {
            'class_year': 2027,
            'intended_language_code': 'FR',
            'language_requirement': 'L3',
        }, format='json', secure=True)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
