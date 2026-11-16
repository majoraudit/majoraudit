import json
from io import StringIO

from django.core.management import call_command
from django.test import SimpleTestCase
from django.urls import URLPattern, URLResolver, get_resolver


class OpenAPISchemaTests(SimpleTestCase):
    def test_generation_is_valid_warning_free_and_covers_every_api_route(self):
        output = StringIO()
        call_command(
            'spectacular', format='openapi-json', validate=True,
            fail_on_warn=True, stdout=output,
        )
        schema = json.loads(output.getvalue())
        self.assertEqual(schema['openapi'], '3.0.3')
        self.assertEqual(schema['components']['securitySchemes']['cookieAuth']['name'], 'sessionid')

        def routes(patterns, prefix=''):
            for pattern in patterns:
                path = prefix + str(pattern.pattern)
                if isinstance(pattern, URLResolver):
                    if not path.startswith('admin/'):
                        yield from routes(pattern.url_patterns, path)
                elif isinstance(pattern, URLPattern) and path.startswith('api/') and pattern.name != 'schema':
                    yield pattern, '/' + path

        for pattern, path in routes(get_resolver().url_patterns):
            # drf-spectacular normalizes Django's generic primary key to id.
            for converter, name in (('int', 'pk'), ('int', 'worksheet_pk'), ('int', 'semester_pk'), ('int', 'external_id'), ('str', 'major_id')):
                path = path.replace(f'<{converter}:{name}>', '{' + ('id' if name == 'pk' else name) + '}')
            with self.subTest(path=path):
                self.assertIn(path, schema['paths'])
                if pattern.name in ('cas_ng_login', 'cas_ng_logout', 'csrf-token'):
                    self.assertFalse(any(schema['paths'][path]['get'].get('security', [])))
                    continue
                view = pattern.callback.cls()
                for method in view.allowed_methods:
                    if method in ('HEAD', 'OPTIONS'):
                        continue
                    operation = schema['paths'][path][method.lower()]
                    self.assertEqual(operation['security'], [{'cookieAuth': []}])
                    self.assertIn('403', operation['responses'])
                    if method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                        self.assertTrue(any(
                            p['name'] == 'X-CSRFToken' and p['in'] == 'header' and p['required']
                            for p in operation['parameters']
                        ))
