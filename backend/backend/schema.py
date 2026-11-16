ERROR = {
    'type': 'object',
    'required': ['detail'],
    'properties': {'detail': {'type': 'string'}},
}

MAJOR_LIST = {
    'type': 'array',
    'items': {
        'type': 'object',
        'required': ['id', 'name'],
        'properties': {'id': {'type': 'string'}, 'name': {'type': 'string'}},
    },
}
MAJOR = {
    'type': 'object',
    'required': ['name', 'specializations'],
    'properties': {
        'name': {'type': 'string'},
        'specializations': {'type': 'array', 'items': {'type': 'string'}},
    },
}
REQUIREMENT = {
    'type': 'object',
    'required': ['query', 'description', 'priority'],
    'properties': {
        'query': {'type': 'object'},
        'description': {'type': 'string'},
        'priority': {'type': 'integer'},
    },
}
MQL = {
    'type': 'object',
    'required': ['version', 'requirements'],
    'properties': {
        'version': {'type': 'string'},
        'requirements': {'type': 'array', 'items': REQUIREMENT},
    },
}
MATCHING_EVAL = {
    'type': 'object',
    'required': ['results', 'allSelectedCourses'],
    'properties': {
        'results': {
            'type': 'array',
            'items': {
                'type': 'object',
                'required': ['requirement', 'selectedCourses'],
                'properties': {
                    'requirement': REQUIREMENT,
                    'selectedCourses': {'type': 'array', 'items': {}},
                },
            },
        },
        'allSelectedCourses': {'type': 'array', 'items': {}},
    },
}
SOLVE_REQUEST = {
    'type': 'object',
    'required': ['matching_eval'],
    'properties': {
        'matching_eval': MATCHING_EVAL,
        'include_query': {'type': 'boolean', 'default': False},
    },
}
SOLVE_RESULT = {
    'type': 'object',
    'required': [
        'version', 'status', 'status_cpsat', 'total_satisfied', 'total_courses',
        'selected_courses', 'selected_placements', 'per_requirement',
    ],
    'properties': {
        'version': {'type': 'integer'},
        'status': {'type': 'string', 'enum': ['ok', 'no_solution']},
        'status_cpsat': {'type': 'string'},
        'total_satisfied': {'type': 'integer'},
        'total_courses': {'type': 'integer'},
        'selected_courses': {'type': 'array', 'items': {'type': 'string'}},
        'selected_placements': {'type': 'array', 'items': {'type': 'string'}},
        'per_requirement': {
            'type': 'array',
            'items': {
                'type': 'object',
                'required': ['description', 'priority', 'satisfied', 'selected'],
                'properties': {
                    'description': {'type': 'string'},
                    'priority': {'type': 'integer'},
                    'satisfied': {'type': 'boolean'},
                    'selected': {
                        'type': 'array',
                        'items': {
                            'type': 'object', 'required': ['course_id', 'selector_path'],
                            'properties': {
                                'course_id': {'type': 'string'},
                                'group_index': {'type': 'integer'},
                                'selector_path': {
                                    'type': 'object', 'required': ['selector_index', 'selector_kind'],
                                    'properties': {
                                        'selector_index': {'type': 'integer'},
                                        'selector_kind': {'type': 'string'},
                                        'nested_path': {'type': 'array', 'items': {'type': 'object'}},
                                    },
                                },
                            },
                        },
                    },
                    'query': {'type': 'object'},
                },
            },
        },
    },
}
BATCH_REQUEST = {
    'type': 'object',
    'required': ['batch'],
    'properties': {
        'batch': {
            'type': 'array', 'minItems': 1, 'maxItems': 100,
            'items': {
                'type': 'object',
                'required': ['matching_eval'],
                'properties': {'id': {}, 'matching_eval': MATCHING_EVAL},
            },
        },
        'include_query': {'type': 'boolean'},
    },
}
BATCH_RESULT = {
    'type': 'object',
    'required': ['results', 'summary'],
    'properties': {
        'results': {
            'type': 'array',
            'items': {
                'type': 'object', 'required': ['id', 'status'],
                'properties': {
                    'id': {}, 'status': {'type': 'string'},
                    'result': SOLVE_RESULT, 'error': {'type': 'string'},
                },
            },
        },
        'summary': {
            'type': 'object', 'required': ['total', 'successful', 'failed'],
            'properties': {key: {'type': 'integer'} for key in ('total', 'successful', 'failed')},
        },
    },
}


def add_error_responses(result, generator, request, public):
    for path in result['paths'].values():
        for method, operation in path.items():
            if method not in ('get', 'post', 'put', 'patch', 'delete'):
                continue
            responses = operation['responses']
            if operation.get('security'):
                responses.setdefault('403', {
                    'description': 'Authentication or CSRF check failed.',
                    'content': {'application/json': {'schema': ERROR}},
                })
                if method in ('post', 'put', 'patch', 'delete'):
                    operation.setdefault('parameters', []).append({
                        'name': 'X-CSRFToken', 'in': 'header', 'required': True,
                        'description': 'Token from /api/auth/csrf/; send with the session and CSRF cookies.',
                        'schema': {'type': 'string'},
                    })
            responses.setdefault('404', {
                'description': 'Resource not found.',
                'content': {'application/json': {'schema': ERROR}},
            })
            if method in ('post', 'put', 'patch'):
                responses.setdefault('400', {
                    'description': 'Invalid request; errors are keyed by field or error.',
                    'content': {'application/json': {'schema': {'type': 'object'}}},
                })
    return result
