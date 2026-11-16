from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import resolve, reverse
from rest_framework.test import APIClient

from courses.models import Course
from worksheets.models import (
    UserWorksheet, UserWorksheetSemester, UserWorksheetClass, WorksheetMajor,
)


class ProtectedRouteTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username='alice')
        cls.other = get_user_model().objects.create_user(username='bob')
        cls.worksheet = UserWorksheet.objects.create(user=cls.user, name='Alice')
        cls.semester = UserWorksheetSemester.objects.create(
            worksheet=cls.worksheet, year=2026, season='FA',
        )
        cls.course = Course.objects.create(
            external_id=123, title='Test course', description='', credits=1,
        )
        cls.course_entry = UserWorksheetClass.objects.create(
            worksheet_semester=cls.semester, course=cls.course,
        )
        cls.major = WorksheetMajor.objects.create(
            worksheet=cls.worksheet, major_id='computer_science',
        )

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True, HTTP_ORIGIN='https://testserver')
        worksheet = {'worksheet_pk': self.worksheet.pk}
        semester = {**worksheet, 'semester_pk': self.semester.pk}
        self.routes = [
            ('profile', {}), ('schema', {}),
            ('course-list', {}), ('course-detail', {'external_id': self.course.external_id}),
            ('course-coursetable-proxy', {}),
            ('major-list', {}), ('major-id', {'major_id': 'computer_science'}),
            ('major-id-mql', {'major_id': 'computer_science'}),
            ('check-major-status', {}), ('solve', {}), ('solve_detailed', {}),
            ('solver', {}), ('batch_solver', {}),
            ('worksheet-list', {}), ('worksheet-detail', {'pk': self.worksheet.pk}),
            ('semester-list', worksheet),
            ('semester-detail', {**worksheet, 'pk': self.semester.pk}),
            ('semester-class-list', semester),
            ('semester-class-detail', {**semester, 'pk': self.course_entry.pk}),
            ('ws-major-list', worksheet),
            ('ws-major-detail', {**worksheet, 'pk': self.major.pk}),
        ]

    def test_anonymous_requests_are_denied_for_every_protected_method(self):
        for name, kwargs in self.routes:
            url = reverse(name, kwargs=kwargs)
            methods = resolve(url).func.cls().allowed_methods
            if 'GET' in methods:
                methods.append('HEAD')
            for method in methods:
                with self.subTest(route=name, method=method):
                    response = self.client.generic(
                        method, url, '{}', content_type='application/json', secure=True,
                        HTTP_ACCEPT=('application/vnd.oai.openapi+json' if name == 'schema' else 'application/json'),
                    )
                    self.assertEqual(response.status_code, 403)
                    if method != 'HEAD':
                        self.assertIn('detail', response.json())

    def test_session_writes_require_a_valid_csrf_token(self):
        self.client.force_login(self.user)
        self.client.get(reverse('csrf-token'), secure=True)
        for name, kwargs in self.routes:
            url = reverse(name, kwargs=kwargs)
            for method in resolve(url).func.cls().allowed_methods:
                if method not in ('POST', 'PUT', 'PATCH', 'DELETE'):
                    continue
                for token in ('', 'incorrect-token'):
                    with self.subTest(route=name, method=method, token=token):
                        response = self.client.generic(
                            method, url, '{}', content_type='application/json',
                            HTTP_X_CSRFTOKEN=token, secure=True,
                        )
                        self.assertEqual(response.status_code, 403)
                        self.assertIn('CSRF', response.json()['detail'])

    def test_csrf_bootstrap_allows_a_session_write(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('csrf-token'), secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.cookies[settings.CSRF_COOKIE_NAME]['secure'])
        response = self.client.patch(
            reverse('profile'), {'class_year': 2027}, format='json', secure=True,
            HTTP_X_CSRFTOKEN=response.json()['csrfToken'],
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.class_year, 2027)
        self.assertIsNone(self.other.class_year)

    def test_a_valid_token_does_not_allow_a_foreign_origin(self):
        self.client.force_login(self.user)
        token = self.client.get(reverse('csrf-token'), secure=True).json()['csrfToken']
        response = self.client.patch(
            reverse('profile'), {'class_year': 2027}, format='json', secure=True,
            HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN='https://attacker.invalid',
        )
        self.assertEqual(response.status_code, 403)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.class_year)

    def test_foreign_resources_reject_every_supported_write(self):
        self.client.force_login(self.other)
        token = self.client.get(reverse('csrf-token'), secure=True).json()['csrfToken']
        cases = [
            ('worksheet-detail', {'pk': self.worksheet.pk}, {'name': 'Hacked'}),
            ('semester-detail', {'worksheet_pk': self.worksheet.pk, 'pk': self.semester.pk},
             {'year': 2027, 'season': 'SP'}),
            ('semester-class-detail', {'worksheet_pk': self.worksheet.pk,
             'semester_pk': self.semester.pk, 'pk': self.course_entry.pk},
             {'course': self.course.external_id, 'creditdf': True}),
            ('ws-major-detail', {'worksheet_pk': self.worksheet.pk, 'pk': self.major.pk}, {}),
        ]
        for name, kwargs, data in cases:
            url = reverse(name, kwargs=kwargs)
            methods = resolve(url).func.cls().allowed_methods
            for method in ('GET', 'PUT', 'PATCH', 'DELETE'):
                if method not in methods:
                    continue
                with self.subTest(route=name, method=method):
                    response = getattr(self.client, method.lower())(
                        url, data if method in ('PUT', 'PATCH') else None, format='json',
                        secure=True, HTTP_X_CSRFTOKEN=token,
                    )
                    self.assertEqual(response.status_code, 404)
        self.worksheet.refresh_from_db()
        self.semester.refresh_from_db()
        self.course_entry.refresh_from_db()
        self.major.refresh_from_db()
        self.assertEqual(self.worksheet.name, 'Alice')
        self.assertEqual(self.semester.year, 2026)
        self.assertFalse(self.course_entry.creditdf)

    def test_creation_cannot_spoof_an_owner_or_parent(self):
        self.client.force_login(self.user)
        token = self.client.get(reverse('csrf-token'), secure=True).json()['csrfToken']
        response = self.client.post(reverse('worksheet-list'), {
            'name': 'Owned by requester', 'user': self.other.pk,
        }, format='json', secure=True, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        created = UserWorksheet.objects.get(pk=response.json()['id'])
        self.assertEqual(created.user_id, self.user.pk)
        response = self.client.post(reverse('semester-list', kwargs={'worksheet_pk': self.worksheet.pk}), {
            'year': 2027, 'season': 'SP', 'worksheet': created.pk,
        }, format='json', secure=True, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(UserWorksheetSemester.objects.get(pk=response.json()['id']).worksheet_id, self.worksheet.pk)

    def test_invalid_expired_and_inactive_sessions_are_denied(self):
        self.client.cookies[settings.SESSION_COOKIE_NAME] = 'invalid-session'
        self.assertEqual(self.client.get(reverse('profile'), secure=True).status_code, 403)
        self.client.force_login(self.user)
        session = self.client.session
        session.set_expiry(-1)
        session.save()
        self.assertEqual(self.client.get(reverse('profile'), secure=True).status_code, 403)
        self.client.force_login(self.user)
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        self.assertEqual(self.client.get(reverse('profile'), secure=True).status_code, 403)

    def test_admin_requires_staff_privileges(self):
        response = self.client.get(reverse('admin:index'), secure=True)
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.startswith(reverse('cas_ng_login')))
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(reverse('admin:index'), secure=True).status_code, 403)
        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        self.assertEqual(self.client.get(reverse('admin:index'), secure=True).status_code, 200)

    def test_profile_cannot_change_identity_or_privileges(self):
        self.client.force_login(self.user)
        token = self.client.get(reverse('csrf-token'), secure=True).json()['csrfToken']
        response = self.client.patch(reverse('profile'), {
            'id': 'bob', 'username': 'bob', 'is_staff': True,
            'is_superuser': True, 'is_active': False,
        }, format='json', secure=True, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'alice')
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)
        self.assertTrue(self.user.is_active)

    def test_class_routes_must_match_both_parent_ids(self):
        self.client.force_login(self.user)
        token = self.client.get(reverse('csrf-token'), secure=True).json()['csrfToken']
        for owner in (self.user, self.other):
            wrong_worksheet = UserWorksheet.objects.create(user=owner, name='Other')
            kwargs = {'worksheet_pk': wrong_worksheet.pk, 'semester_pk': self.semester.pk}
            cases = [
                ('semester-class-list', kwargs, 'get', None, 200),
                ('semester-class-list', kwargs, 'post', {'course': self.course.external_id}, 404),
            ]
            cases.extend(
                ('semester-class-detail', {**kwargs, 'pk': self.course_entry.pk}, method, {}, 404)
                for method in ('get', 'put', 'patch', 'delete')
            )
            for name, route_kwargs, method, data, expected in cases:
                with self.subTest(owner=owner.username, route=name, method=method):
                    response = getattr(self.client, method)(
                        reverse(name, kwargs=route_kwargs), data, format='json',
                        secure=True, HTTP_X_CSRFTOKEN=token,
                    )
                    self.assertEqual(response.status_code, expected)
                    if method == 'get' and name == 'semester-class-list':
                        self.assertEqual(response.json(), [])
        self.assertEqual(UserWorksheetClass.objects.count(), 1)

    def test_worksheet_major_cannot_be_accessed_through_a_different_parent(self):
        self.client.force_login(self.user)
        wrong_worksheet = UserWorksheet.objects.create(user=self.user, name='Other')
        token = self.client.get(reverse('csrf-token'), secure=True).json()['csrfToken']
        url = reverse('ws-major-detail', kwargs={
            'worksheet_pk': wrong_worksheet.pk, 'pk': self.major.pk,
        })
        for method in ('get', 'delete'):
            with self.subTest(method=method):
                response = getattr(self.client, method)(url, secure=True, HTTP_X_CSRFTOKEN=token)
                self.assertEqual(response.status_code, 404)
        self.assertTrue(WorksheetMajor.objects.filter(pk=self.major.pk).exists())
