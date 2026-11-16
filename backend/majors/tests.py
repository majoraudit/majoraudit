from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient


class SolverAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True, HTTP_ORIGIN='https://testserver')
        self.client.force_login(get_user_model().objects.create_user(username='alice'))
        token = self.client.get(reverse('csrf-token'), secure=True).json()['csrfToken']
        self.client.credentials(HTTP_X_CSRFTOKEN=token)
        course = {'codes': ['CPSC 3650'], 'season_codes': ['202603']}
        self.requirement = {
            'description': 'Algorithms', 'priority': 1,
            'query': {
                'quantity': {'Single': 1},
                'selector': [{'Class': {'department_id': 'CPSC', 'course_number': 3650}}],
            },
        }
        self.matching = {
            'results': [{'requirement': self.requirement, 'selectedCourses': [[course]]}],
            'allSelectedCourses': [course],
        }

    def test_authenticated_json_requests_return_the_current_solver_contract(self):
        for name in ('solve', 'solve_detailed', 'solver'):
            with self.subTest(route=name):
                response = self.client.post(reverse(name), {
                    'matching_eval': self.matching,
                }, format='json', secure=True)
                self.assertEqual(response.status_code, 200, response.content)
                result = response.json()
                self.assertEqual(result['version'], 2)
                self.assertEqual(result['status'], 'ok')
                self.assertEqual(result['total_satisfied'], 1)
                self.assertEqual(result['total_courses'], 1)
                self.assertEqual(result['selected_courses'], ['CPSC 3650'])
                requirement = result['per_requirement'][0]
                self.assertTrue(requirement['satisfied'])
                self.assertEqual(requirement['selected'], [{
                    'course_id': 'CPSC 3650', 'group_index': 0,
                    'selector_path': {'selector_index': 0, 'selector_kind': 'Class'},
                }])
                self.assertEqual('query' in requirement, name == 'solve_detailed')

    def test_include_query_is_preserved(self):
        for name in ('solve', 'solver'):
            with self.subTest(route=name):
                response = self.client.post(reverse(name), {
                    'matching_eval': self.matching, 'include_query': True,
                }, format='json', secure=True)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['per_requirement'][0]['query'], self.requirement['query'])

    def test_batch_preserves_successes_and_reports_invalid_items(self):
        response = self.client.post(reverse('batch_solver'), {'batch': [
            {'id': 'valid', 'matching_eval': self.matching}, {'id': 'invalid'},
        ]}, format='json', secure=True)
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result['summary'], {'total': 2, 'successful': 1, 'failed': 1})
        self.assertEqual(result['results'][0]['result']['selected_courses'], ['CPSC 3650'])
        self.assertEqual(result['results'][1]['status'], 'error')

    def test_malformed_or_non_object_json_is_a_client_error(self):
        for name in ('solve', 'solve_detailed', 'solver', 'batch_solver', 'check-major-status'):
            for body in ('{', '[]', 'null', '"string"'):
                with self.subTest(route=name, body=body):
                    response = self.client.post(
                        reverse(name), body, content_type='application/json', secure=True,
                    )
                    self.assertEqual(response.status_code, 400, response.content)

    def test_missing_or_invalid_matching_data_is_rejected(self):
        for name in ('solve', 'solve_detailed', 'solver'):
            for body in ({}, {'matching_eval': []}, {'matching_eval': {'results': {}}}):
                with self.subTest(route=name, body=body):
                    response = self.client.post(reverse(name), body, format='json', secure=True)
                    self.assertEqual(response.status_code, 400, response.content)

    def test_batch_limits_are_enforced(self):
        for batch in ([], {}, [{}] * 101):
            with self.subTest(batch_size=len(batch)):
                response = self.client.post(reverse('batch_solver'), {'batch': batch}, format='json', secure=True)
                self.assertEqual(response.status_code, 400)
