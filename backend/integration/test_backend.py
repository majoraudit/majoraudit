"""Real HTTP tests against Linux Gunicorn, Nginx TLS, and a CAS protocol peer."""

import copy
import json
import os
import secrets
import subprocess
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urljoin, urlsplit, urlunsplit

import requests
from openapi_core import OpenAPI
from openapi_core.contrib.requests import RequestsOpenAPIRequest, RequestsOpenAPIResponse
from openapi_core.exceptions import OpenAPIError
from testcontainers.core.container import DockerContainer
from testcontainers.core.image import DockerImage
from testcontainers.core.network import Network
from testcontainers.core.wait_strategies import HttpWaitStrategy, LogMessageWaitStrategy


BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent


class BackendIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.stack = ExitStack()
        cls.addClassCleanup(cls.stack.close)
        network = cls.stack.enter_context(Network())
        cert_dir = Path(cls.stack.enter_context(tempfile.TemporaryDirectory()))
        cls.certificate = cert_dir / 'localhost.crt'
        subprocess.run([
            'openssl', 'req', '-x509', '-nodes', '-newkey', 'rsa:2048', '-days', '1',
            '-keyout', str(cert_dir / 'localhost.key'), '-out', str(cls.certificate),
            '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
        ], check=True, capture_output=True)

        cas = cls.stack.enter_context(
            DockerContainer('python:3.12-slim')
            .with_network(network).with_network_aliases('cas').with_exposed_ports(8080)
            .with_copy_into_container(BACKEND / 'integration/cas_server.py', '/cas_server.py')
            .with_command(['python', '-u', '/cas_server.py'])
            .waiting_for(LogMessageWaitStrategy('CAS fixture ready').with_startup_timeout(60))
        )
        cls.cas_url = f'http://{cas.get_container_host_ip()}:{cas.get_exposed_port(8080)}'

        # Start Nginx after its backend exists; reserve its public port first.
        cls.proxy = cls.stack.enter_context(
            DockerContainer('nginx:1.27-alpine').with_network(network).with_exposed_ports(443)
            .with_copy_into_container(ROOT / 'frontend/nginx.conf', '/etc/nginx/conf.d/default.conf')
            .with_copy_into_container(cls.certificate, '/etc/nginx/certs/localhost.crt')
            .with_copy_into_container(cert_dir / 'localhost.key', '/etc/nginx/certs/localhost.key', 0o600)
            .with_command(['sleep', 'infinity'])
        )
        cls.base_url = f'https://{cls.proxy.get_container_host_ip()}:{cls.proxy.get_exposed_port(443)}'
        image = os.getenv('BACKEND_TEST_IMAGE')
        if not image:
            image = str(cls.stack.enter_context(DockerImage(path=BACKEND, target='production')))
        cls.backend = cls.stack.enter_context(
            DockerContainer(image).with_network(network).with_network_aliases('backend')
            .with_envs(
                DJANGO_SECRET_KEY=secrets.token_urlsafe(50), DJANGO_DEBUG='False',
                DJANGO_ALLOWED_HOSTS='localhost,127.0.0.1,backend',
                FRONTEND_URL=cls.base_url, COOKIE_SECURE='True', COOKIE_SAMESITE='None',
                SECURE_SSL_REDIRECT='True', CAS_URL='http://cas:8080/cas/',
                YALIES_URL='http://cas:8080/v2/', YALIES_API_KEY='test-only-yalies-key',
                DATABASE_PATH='/tmp/integration.sqlite3', STATIC_ROOT='/tmp/static',
            )
            .waiting_for(LogMessageWaitStrategy('Booting worker').with_startup_timeout(60))
        )
        result = cls.proxy.exec(['nginx'])
        if result.exit_code:
            raise RuntimeError(result.output.decode())
        HttpWaitStrategy(443, '/api/auth/csrf/').using_tls(insecure=True).with_startup_timeout(60).wait_until_ready(cls.proxy)
        seed = cls.backend.exec(['python', 'manage.py', 'shell', '-c',
            "from courses.models import Course, CourseCode, CourseInstance, CourseTag, CourseProfessor; "
            "c=Course.objects.create(external_id=123,title='Algorithms',description='Test course',credits=1); "
            "c.distributionals.add('QR'); c.course_tags.add(CourseTag.objects.create(name='Test tag')); "
            "i=CourseInstance.objects.create(course=c,external_id=456,year=2026,season='FA',section_num='01'); "
            "i.course_codes.add(CourseCode.objects.create(department='CPSC',number='3650')); "
            "i.course_professors.add(CourseProfessor.objects.create(external_id=789,name='Test professor'))"])
        if seed.exit_code:
            raise RuntimeError(seed.output.decode())

    def browser(self):
        browser = requests.Session()
        browser.verify = str(self.certificate)
        browser.trust_env = False
        self.addCleanup(browser.close)
        return browser

    def request(self, browser, method, path, expected, **kwargs):
        response = browser.request(
            method, self.base_url + path, timeout=15, allow_redirects=False, **kwargs,
        )
        self.assertEqual(response.status_code, expected, response.text[:1000])
        return response

    def issue_ticket(self, browser, username='alice', next_path=None):
        path = '/api/auth/login/'
        if next_path:
            path += '?' + urlencode({'next': next_path})
        redirect = self.request(browser, 'GET', path, 302)
        cas_login = urlsplit(redirect.headers['Location'])
        self.assertEqual((cas_login.netloc, cas_login.path), ('cas:8080', '/cas/login'))
        service = parse_qs(cas_login.query)['service'][0]
        self.assertTrue(service.startswith(self.base_url + '/api/auth/login/'))
        # Host-mapped port for the browser; Django validates over the Docker network.
        login_url = self.cas_url + cas_login.path + '?' + cas_login.query
        login_page = browser.get(login_url, timeout=10)
        self.assertEqual(login_page.status_code, 200)
        self.assertIn('name="password"', login_page.text)
        callback = browser.post(login_url, data={
            'username': username, 'password': 'test-only-password',
        }, timeout=10, allow_redirects=False)
        self.assertEqual(callback.status_code, 302)
        return callback.headers['Location'], redirect

    def login(self, browser, username='alice'):
        callback, _ = self.issue_ticket(browser, username)
        response = browser.get(callback, timeout=15, allow_redirects=False)
        self.assertEqual(response.status_code, 302, response.text)
        self.assertEqual(urljoin(self.base_url, response.headers['Location']), self.base_url + '/')
        return callback, response

    def csrf(self, browser):
        token = self.request(browser, 'GET', '/api/auth/csrf/', 200).json()['csrfToken']
        return {'X-CSRFToken': token, 'Origin': self.base_url}

    def test_cas_login_session_csrf_and_logout(self):
        browser = self.browser()
        self.request(browser, 'GET', '/api/auth/profile/', 403)
        self.request(browser, 'GET', '/api/auth/csrf/', 200)
        old_token = browser.cookies.get('csrftoken')
        callback, response = self.login(browser)
        self.assertNotEqual(browser.cookies.get('csrftoken'), old_token)
        cookies = response.headers['Set-Cookie']
        for flag in ('HttpOnly', 'Secure', 'SameSite=None'):
            self.assertIn(flag, cookies)
        profile = self.request(browser, 'GET', '/api/auth/profile/', 200).json()
        self.assertEqual(profile['id'], 'alice')
        self.assertEqual(profile['email'], 'alice@yale.edu')
        self.assertEqual(profile['first_name'], 'Alice')
        self.request(browser, 'PATCH', '/api/auth/profile/', 403, json={'class_year': 2027})
        self.request(browser, 'PATCH', '/api/auth/profile/', 403, json={'class_year': 2027},
                     headers={'X-CSRFToken': old_token, 'Origin': self.base_url})
        updated = self.request(browser, 'PATCH', '/api/auth/profile/', 200,
                               json={'class_year': 2027}, headers=self.csrf(browser))
        self.assertEqual(updated.json()['class_year'], 2027)
        saved_session = browser.cookies.get('sessionid')
        logout = self.request(browser, 'GET', '/api/auth/logout/', 302)
        self.assertEqual(urljoin(self.base_url, logout.headers['Location']), self.base_url + '/')
        self.request(browser, 'GET', '/api/auth/profile/', 403)
        browser.cookies.set('sessionid', saved_session, secure=True)
        self.request(browser, 'GET', '/api/auth/profile/', 403)
        replay = self.browser().get(callback, timeout=15, allow_redirects=False)
        self.assertEqual(replay.status_code, 403)

    def test_invalid_wrong_service_and_consumed_tickets_do_not_create_sessions(self):
        browser = self.browser()
        self.request(browser, 'GET', '/api/auth/login/?ticket=ST-invalid', 403)
        self.request(browser, 'GET', '/api/auth/profile/', 403)
        callback, _ = self.issue_ticket(browser)
        parsed = urlsplit(callback)
        query = parse_qs(parsed.query)
        query['next'] = ['/different-service']
        wrong_service = urlunsplit(parsed._replace(query=urlencode(query, doseq=True)))
        denied = browser.get(wrong_service, timeout=15, allow_redirects=False)
        self.assertEqual(denied.status_code, 403)
        self.request(browser, 'GET', '/api/auth/profile/', 403)
        consumed = browser.get(callback, timeout=15, allow_redirects=False)
        self.assertEqual(consumed.status_code, 403)

    def test_local_next_path_survives_the_cas_round_trip(self):
        browser = self.browser()
        callback, _ = self.issue_ticket(browser, next_path='/dashboard')
        response = browser.get(callback, timeout=15, allow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(urljoin(self.base_url, response.headers['Location']), self.base_url + '/dashboard')
        self.request(browser, 'GET', '/api/auth/profile/', 200)

    def test_two_cas_users_cannot_access_each_others_data(self):
        alice, bob = self.browser(), self.browser()
        self.login(alice, 'alice')
        self.login(bob, 'bob')
        headers = self.csrf(alice)
        worksheet = self.request(alice, 'POST', '/api/worksheets/', 201,
                                 json={'name': 'Private'}, headers=headers).json()
        path = f'/api/worksheets/{worksheet["id"]}/'
        bob_headers = self.csrf(bob)
        self.request(bob, 'GET', path, 404)
        self.request(bob, 'PATCH', path, 404, json={'name': 'Hacked'}, headers=bob_headers)
        self.request(bob, 'DELETE', path, 404, headers=bob_headers)
        self.assertNotIn(worksheet['id'], [w['id'] for w in self.request(bob, 'GET', '/api/worksheets/', 200).json()])
        self.assertEqual(self.request(alice, 'GET', path, 200).json()['name'], 'Private')

    def test_openapi_contracts_against_live_backend(self):
        browser = self.browser()
        _, login_response = self.login(browser)
        schema_response = self.request(browser, 'GET', '/api/schema/?format=json', 200)
        schema = schema_response.json()
        contract = OpenAPI.from_dict(schema)
        contract.validate_response(
            RequestsOpenAPIRequest(login_response.request), RequestsOpenAPIResponse(login_response),
        )
        headers = self.csrf(browser)

        def check(method, path, status=200, *, validate_request=True, **kwargs):
            response = self.request(browser, method, path, status, headers=headers, **kwargs)
            request = RequestsOpenAPIRequest(response.request)
            if validate_request:
                contract.validate_request(request)
            contract.validate_response(request, RequestsOpenAPIResponse(response))
            return response

        check('GET', '/api/auth/csrf/')
        profile = check('GET', '/api/auth/profile/')
        check('PATCH', '/api/auth/profile/', json={'class_year': 2028})
        check('PATCH', '/api/auth/profile/', 400, json={'class_year': -1}, validate_request=False)
        check('GET', '/api/courses/?limit=1&offset=0')
        check('GET', '/api/courses/123/')
        check('GET', '/api/courses/999999/', 404)
        check('GET', '/api/courses/coursetable/', 400, validate_request=False)
        check('GET', '/api/majors/')
        check('GET', '/api/majors/computer_science/')
        check('GET', '/api/majors/computer_science/mql/?specialization=computer_science_ba')
        check('GET', '/api/majors/missing/', 404)
        check('POST', '/api/majors/check/', 400, json={}, validate_request=False)
        candidate = {'codes': ['CPSC 3650'], 'season_codes': ['202603']}
        matching = {
            'results': [{
                'requirement': {
                    'description': 'Algorithms', 'priority': 1,
                    'query': {
                        'quantity': {'Single': 1},
                        'selector': [{'Class': {'department_id': 'CPSC', 'course_number': 3650}}],
                    },
                },
                'selectedCourses': [[candidate]],
            }],
            'allSelectedCourses': [candidate],
        }
        for endpoint in ('solve/', 'solve/detailed/', 'solver/'):
            check('POST', '/api/majors/' + endpoint, json={'matching_eval': matching})
            check('POST', '/api/majors/' + endpoint, 400, json={}, validate_request=False)
        check('GET', '/api/majors/solver/')
        check('POST', '/api/majors/solver/batch/', json={'batch': [{'id': 'sample', 'matching_eval': matching}]})

        worksheet = check('POST', '/api/worksheets/', 201, json={'name': 'Contract'}).json()
        ws = f'/api/worksheets/{worksheet["id"]}/'
        check('GET', '/api/worksheets/')
        check('GET', ws)
        check('PUT', ws, json={'name': 'Renamed'})
        check('PATCH', ws, json={'name': 'Patched'})
        semester = check('POST', ws + 'semesters/', 201, json={'year': 2026, 'season': 'FA'}).json()
        sem = ws + f'semesters/{semester["id"]}/'
        check('GET', ws + 'semesters/')
        check('GET', sem)
        check('PUT', sem, json={'year': 2026, 'season': 'SP', 'title': 'Spring'})
        check('PATCH', sem, json={'is_completed': True})
        entry = check('POST', sem + 'classes/', 201, json={'course': 123}).json()
        course = sem + f'classes/{entry["id"]}/'
        check('GET', sem + 'classes/')
        check('GET', course)
        check('PUT', course, json={'course': None, 'course_instance': 456, 'creditdf': True})
        check('PATCH', course, json={'creditdf': False})
        major = check('POST', ws + 'majors/', 201, json={'major_id': 'computer_science', 'specialization': 'computer_science_ba'}).json()
        major_path = ws + f'majors/{major["id"]}/'
        check('GET', ws + 'majors/')
        check('GET', major_path)
        check('DELETE', major_path, 204)
        check('DELETE', course, 204)
        check('DELETE', sem, 204)
        check('DELETE', ws, 204)

        # Prove the validator catches response drift, rather than only valid JSON.
        broken = copy.copy(profile)
        body = profile.json()
        del body['id']
        broken._content = json.dumps(body).encode()
        with self.assertRaises(OpenAPIError):
            contract.validate_response(RequestsOpenAPIRequest(profile.request), RequestsOpenAPIResponse(broken))
        check('GET', '/api/auth/logout/', 302)
        check('GET', '/api/auth/profile/', 403, validate_request=False)


if __name__ == '__main__':
    unittest.main()
