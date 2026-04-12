import re
import json
import logging
import os
from abc import ABC
from pathlib import Path

from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, NotFound, ParseError

import pylibmql

from .engine import Solver, API_LATEST
from .serializers import WorksheetMajorSerializer
from worksheets.models import UserWorksheet, WorksheetMajor
from worksheets.permissions import IsOwnerPermission

logger = logging.getLogger(__name__)

def validate_matching_eval(data: dict) -> tuple[bool, str]:
    """
    Validate the structure of matching_eval input.
    
    Returns:
        (is_valid, error_message)
    """
    if not isinstance(data, dict):
        return False, "Input must be a JSON object"
    
    if "results" not in data:
        return False, "Missing required field: results"
    
    if "allSelectedCourses" not in data:
        return False, "Missing required field: allSelectedCourses"
    
    if not isinstance(data["results"], list):
        return False, "Field 'results' must be an array"
    
    if not isinstance(data["allSelectedCourses"], list):
        return False, "Field 'allSelectedCourses' must be an array"
    
    # Validate each result has required structure
    for i, result in enumerate(data["results"]):
        if not isinstance(result, dict):
            return False, f"results[{i}] must be an object"
        
        if "requirement" not in result:
            return False, f"results[{i}] missing required field: requirement"
        
        if "selectedCourses" not in result:
            return False, f"results[{i}] missing required field: selectedCourses"
        
        req = result["requirement"]
        if not isinstance(req, dict):
            return False, f"results[{i}].requirement must be an object"
        
        required_req_fields = ["query", "description", "priority"]
        for field in required_req_fields:
            if field not in req:
                return False, f"results[{i}].requirement missing field: {field}"
    
    return True, ""


def create_error_response(message: str, status_code: int = 400) -> JsonResponse:
    """Create a standardized error response."""
    return JsonResponse(
        {
            "error": message,
            "status": "error"
        },
        status=status_code
    )


def create_success_response(data: dict, status_code: int = 200) -> JsonResponse:
    """Create a standardized success response."""
    return JsonResponse(data, status=status_code)


@csrf_exempt
@require_http_methods(["POST"])
def solve_requirements(request):
    """
    Solve course matching requirements using CP-SAT.
    
    POST /api/solve/
    
    Request Body:
        {
            "matching_eval": { ... },  // Output from frontend MQL matcher
            "include_query": false      // Optional: include query in response
        }
    
    Response:
        {
            "status": "ok" | "no_solution",
            "status_cpsat": "OPTIMAL" | "FEASIBLE" | ...,
            "total_satisfied": 5,
            "total_courses": 8,
            "selected_courses": ["CPSC 201", ...],
            "selected_placements": ["PLACEMENT:uuid", ...],
            "per_requirement": [
                {
                    "description": "Take 2 CPSC courses",
                    "priority": 10,
                    "satisfied": true,
                    "selected": [
                        {
                            "course_id": "CPSC 201",
                            "selector_path": {
                                "selector_index": 0,
                                "selector_kind": "Range"
                            },
                            "group_index": 0
                        }
                    ]
                }
            ]
        }
    """
    solver = Solver(API_LATEST)
    
    try:
        # Parse request body
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError as e:
            return create_error_response(f"Invalid JSON: {str(e)}")
        
        # Extract parameters
        matching_eval = body.get("matching_eval")
        include_query = body.get("include_query", False)
        
        if matching_eval is None:
            return create_error_response("Missing required field: matching_eval")
        
        # Validate input structure
        is_valid, error_msg = validate_matching_eval(matching_eval)
        if not is_valid:
            return create_error_response(f"Invalid matching_eval structure: {error_msg}")
        
        # Run solver
        logger.info(f"Running solver with {len(matching_eval['results'])} requirements")
        result = solver.solve(matching_eval, include_query=include_query)
        
        # Convert to dict and return
        response_data = result.to_dict()
        logger.info(f"Solver completed: status={result.status}, satisfied={result.total_satisfied}/{len(matching_eval['results'])}")
        
        return create_success_response(response_data)
    
    except Exception as e:
        logger.error(f"Error in solve_requirements: {str(e)}", exc_info=True)
        return create_error_response(
            f"Internal server error: {str(e)}",
            status_code=500
        )


@csrf_exempt
@require_http_methods(["POST"])
def solve_requirements_detailed(request):
    """
    Solve course matching requirements with detailed query information.
    
    POST /api/solve/detailed/
    
    Same as solve_requirements but always includes query information in response.
    """
    solver = Solver(API_LATEST)
    try:
        body = json.loads(request.body)
        matching_eval = body.get("matching_eval")
        
        if matching_eval is None:
            return create_error_response("Missing required field: matching_eval")
        
        is_valid, error_msg = validate_matching_eval(matching_eval)
        if not is_valid:
            return create_error_response(f"Invalid matching_eval structure: {error_msg}")
        
        result = solver.solve(matching_eval, include_query=True)
        return create_success_response(result.to_dict())
    
    except json.JSONDecodeError as e:
        return create_error_response(f"Invalid JSON: {str(e)}")
    except Exception as e:
        logger.error(f"Error in solve_requirements_detailed: {str(e)}", exc_info=True)
        return create_error_response(f"Internal server error: {str(e)}", status_code=500)


@method_decorator(csrf_exempt, name='dispatch')
class SolverView(View):
    """
    Class-based view for solver operations.
    
    POST /api/solver/
        Run the solver with standard options
    """
    
    def post(self, request):
        """Handle POST requests to solve requirements."""
        solver = Solver(API_LATEST)
        try:
            body = json.loads(request.body)
            matching_eval = body.get("matching_eval")
            include_query = body.get("include_query", False)
            
            if matching_eval is None:
                return create_error_response("Missing required field: matching_eval")
            
            is_valid, error_msg = validate_matching_eval(matching_eval)
            if not is_valid:
                return create_error_response(f"Invalid matching_eval structure: {error_msg}")
            
            result = solver.solve(matching_eval, include_query=include_query)
            return create_success_response(result.to_dict())
        
        except json.JSONDecodeError as e:
            return create_error_response(f"Invalid JSON: {str(e)}")
        except Exception as e:
            logger.error(f"Error in SolverView.post: {str(e)}", exc_info=True)
            return create_error_response(f"Internal server error: {str(e)}", status_code=500)
    
    def get(self, request):
        """Handle GET requests - return API documentation."""
        return create_success_response({
            "api": "Course Matching Solver",
            "version": "enhanced_v1",
            "endpoints": {
                "POST /api/solver/": "Solve course matching requirements",
                "POST /api/solve/": "Solve with standard options",
                "POST /api/solve/detailed/": "Solve with query details included",
                "GET /api/solve/health/": "Health check"
            },
            "documentation": "Send POST request with matching_eval in body"
        })


@method_decorator(csrf_exempt, name='dispatch')
class BatchSolverView(View):
    """
    Batch solver for multiple independent matching problems.
    
    POST /api/solver/batch/
        Run solver on multiple matching_eval inputs
    """
    
    def post(self, request):
        """
        Solve multiple matching problems in batch.
        
        Request Body:
            {
                "batch": [
                    {
                        "id": "student_1",
                        "matching_eval": { ... }
                    },
                    {
                        "id": "student_2", 
                        "matching_eval": { ... }
                    }
                ],
                "include_query": false
            }
        
        Response:
            {
                "results": [
                    {
                        "id": "student_1",
                        "status": "ok",
                        "result": { ... }
                    },
                    {
                        "id": "student_2",
                        "status": "no_solution",
                        "result": { ... }
                    }
                ],
                "summary": {
                    "total": 2,
                    "successful": 1,
                    "failed": 1
                }
            }
        """
        solver = Solver(API_LATEST)
        try:
            body = json.loads(request.body)
            batch = body.get("batch", [])
            include_query = body.get("include_query", False)
            
            if not isinstance(batch, list):
                return create_error_response("Field 'batch' must be an array")
            
            if len(batch) == 0:
                return create_error_response("Batch cannot be empty")
            
            if len(batch) > 100:
                return create_error_response("Batch size cannot exceed 100")
            
            results = []
            successful = 0
            failed = 0
            
            for i, item in enumerate(batch):
                if not isinstance(item, dict):
                    results.append({
                        "id": f"item_{i}",
                        "status": "error",
                        "error": "Item must be an object"
                    })
                    failed += 1
                    continue
                
                item_id = item.get("id", f"item_{i}")
                matching_eval = item.get("matching_eval")
                
                if matching_eval is None:
                    results.append({
                        "id": item_id,
                        "status": "error",
                        "error": "Missing matching_eval"
                    })
                    failed += 1
                    continue
                
                is_valid, error_msg = validate_matching_eval(matching_eval)
                if not is_valid:
                    results.append({
                        "id": item_id,
                        "status": "error",
                        "error": f"Invalid structure: {error_msg}"
                    })
                    failed += 1
                    continue
                
                try:
                    result = solver.solve(matching_eval, include_query=include_query)
                    results.append({
                        "id": item_id,
                        "status": result.status,
                        "result": result.to_dict()
                    })
                    if result.ok:
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Error solving batch item {item_id}: {str(e)}")
                    results.append({
                        "id": item_id,
                        "status": "error",
                        "error": str(e)
                    })
                    failed += 1
            
            return create_success_response({
                "results": results,
                "summary": {
                    "total": len(batch),
                    "successful": successful,
                    "failed": failed
                }
            })
        
        except json.JSONDecodeError as e:
            return create_error_response(f"Invalid JSON: {str(e)}")
        except Exception as e:
            logger.error(f"Error in BatchSolverView.post: {str(e)}", exc_info=True)
            return create_error_response(f"Internal server error: {str(e)}", status_code=500)


# ---------------------------------------------------------------------------
# Major Template Views
# ---------------------------------------------------------------------------

class MajorListView(APIView):
    """
    List all available major templates.
    
    GET /api/majors/
    
    Response:
        [
            {
                "id": "computer_science",
                "name": "Computer Science"
            },
            ...
        ]
    """
    
    def get(self, request):
        templates_dir = './major_templates/'
        try:
            result = []
            for name in os.listdir(templates_dir):
                dir_path = os.path.join(templates_dir, name)
                if not os.path.isdir(dir_path):
                    continue
                
                json_path = os.path.join(dir_path, f"{name}.json")
                try:
                    with open(json_path) as f:
                        data = json.load(f)
                        result.append({
                            "id": name,
                            "name": data.get("name", name),
                        })
                except (FileNotFoundError, json.JSONDecodeError):
                    result.append({"id": name, "name": name})
            
            return Response(result)
        except FileNotFoundError:
            return Response([], status=404)


class MajorOpView(APIView, ABC):
    """
    Base class for major template operations with path validation.
    """
    BASE_DIR = Path("./major_templates").resolve()
    SAFE_NAME = re.compile(r"^[A-Za-z0-9_-]+$")
    
    def validate_name(self, value, field_name):
        """Validate that a name contains only safe characters."""
        if not value:
            raise ValidationError({field_name: "This field is required."})
        if not self.SAFE_NAME.fullmatch(value):
            raise ValidationError({field_name: "Invalid format."})
        return value
    
    def build_safe_path(self, *parts: str) -> Path:
        """Build a safe path within BASE_DIR."""
        path = (self.BASE_DIR.joinpath(*parts)).resolve()
        if self.BASE_DIR != path and self.BASE_DIR not in path.parents:
            raise ValidationError("Invalid path.")
        return path


class MajorIDView(MajorOpView):
    """
    Get details for a specific major template.
    
    GET /api/majors/{major_id}/
    
    Response:
        {
            "name": "Computer Science",
            "description": "...",
            "specializations": [...],
            ...
        }
    """
    
    def get(self, request, major_id):
        if not self.SAFE_NAME.fullmatch(major_id):
            raise ValidationError({"major_id": "Invalid format."})
        
        path = (self.BASE_DIR / major_id / f"{major_id}.json").resolve()
        
        if self.BASE_DIR not in path.parents:
            raise ValidationError("Invalid path.")
        
        if not path.is_file():
            raise NotFound("Major template not found.")
        
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise ParseError(f"Invalid JSON file: {e.msg}")
        except OSError as e:
            raise ParseError(f"Unable to read file: {str(e)}")
        
        return Response(data)


class MajorIDMQLView(MajorOpView):
    """
    Get MQL template for a specific major and specialization.
    
    GET /api/majors/{major_id}/mql/?specialization={specialization}
    
    Response:
        {
            "version": "1.0",
            "requirements": [...]
        }
    """
    
    def get(self, request, major_id):
        major_id = self.validate_name(major_id, "major_id")
        specialization = self.validate_name(
            request.query_params.get("specialization"),
            "specialization",
        )
        
        path = self.build_safe_path(major_id, f"{specialization}.mql")
        
        if not path.is_file():
            print(f"MQL template not found: {path}")
            logger.warning(f"MQL template not found: {path}")
            raise NotFound("MQL template not found.")
        
        try:
            with path.open("r", encoding="utf-8") as f:
                data = f.read()
        except OSError as e:
            raise ParseError(f"Unable to read template file: {e}")
        
        try:
            result = pylibmql.parse(data).json()
        except Exception as e:
            logger.error(f"Malformed MQL: {path}: {e}")
            raise ParseError(f"Malformed MQL: {e}")
        
        # parse the string into a dict before returning
        return Response(json.loads(result))


def evaluate_major_template(major_id: str, degree_type: str, course_list: list) -> dict:
    """
    Evaluate a major template against a course list using the CP-SAT solver.
    
    Args:
        major_id: The major template identifier
        degree_type: The specialization/degree type
        course_list: List of courses taken by the student
    
    Returns:
        dict: Solver result with requirement satisfaction status
    """
    # Build path to MQL template
    base_dir = Path("./major_templates").resolve()
    safe_name_pattern = re.compile(r"^[A-Za-z0-9_-]+$")
    
    if not safe_name_pattern.fullmatch(major_id):
        raise ValidationError({"major_id": "Invalid format."})
    if not safe_name_pattern.fullmatch(degree_type):
        raise ValidationError({"degree_type": "Invalid format."})
    
    mql_path = base_dir / major_id / f"{degree_type}.mql"
    
    if not mql_path.is_file():
        raise NotFound(f"MQL template not found: {major_id}/{degree_type}")
    
    # Load and parse MQL
    try:
        with mql_path.open("r", encoding="utf-8") as f:
            mql_text = f.read()
        
        mql_query_file = json.loads(pylibmql.parse(mql_text).json())
    except Exception as e:
        raise ParseError(f"Failed to parse MQL template: {e}")
    
    # TODO: This needs to be integrated with your frontend MQL matcher
    # For now, we'll create a stub matching_eval structure
    # In production, you would:
    # 1. Pass course_list through your TypeScript QueryMatcher
    # 2. Get the matching_eval result
    # 3. Pass that to the solver
    
    # Stub implementation - replace with actual matcher integration
    matching_eval = {
        "results": [],
        "allSelectedCourses": course_list
    }
    
    # For each requirement in the MQL, run matching
    # This is a simplified version - you need to integrate your QueryMatcher
    for requirement in mql_query_file.get("requirements", []):
        matching_eval["results"].append({
            "requirement": requirement,
            "selectedCourses": []  # Would come from QueryMatcher
        })
    
    # Run solver
    solver = Solver(API_LATEST)
    try:
        result = solver.solve(matching_eval, include_query=True)
        return result.to_dict()
    except Exception as e:
        logger.error(f"Solver error for {major_id}/{degree_type}: {str(e)}")
        raise ParseError(f"Solver failed: {e}")


@api_view(['POST'])
def check_major_status(request):
    """
    Check major completion status for a student's course list.
    
    POST /api/majors/check-status/
    
    Request Body:
        {
            "courses": [
                {
                    "codes": ["CPSC 201"],
                    "season_codes": ["202501"],
                    "dist": ["QR"],
                    "tags": []
                },
                ...
            ],
            "major_id": "computer_science",
            "degree_type": "standard"
        }
    
    Response:
        {
            "status": "ok",
            "total_satisfied": 8,
            "total_courses": 12,
            "per_requirement": [
                {
                    "description": "Intro Programming",
                    "satisfied": true,
                    "selected": [...]
                },
                ...
            ]
        }
    """
    course_list = request.data.get('courses', [])
    major_id = request.data.get('major_id')
    degree_type = request.data.get('degree_type')
    
    if not major_id:
        return Response(
            {"error": "major_id is required"},
            status=400
        )
    
    if not degree_type:
        return Response(
            {"error": "degree_type is required"},
            status=400
        )
    
    if not course_list:
        return Response(
            {"error": "courses list is required"},
            status=400
        )
    
    try:
        result = evaluate_major_template(major_id, degree_type, course_list)
        return Response(result)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)
    except NotFound as e:
        return Response({"error": str(e)}, status=404)
    except ParseError as e:
        return Response({"error": str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error in check_major_status: {str(e)}", exc_info=True)
        return Response(
            {"error": f"Internal server error: {str(e)}"},
            status=500
        )


# ---------------------------------------------------------------------------
# Async Views (Django 4.1+)
# ---------------------------------------------------------------------------

from asgiref.sync import sync_to_async

@csrf_exempt
@require_http_methods(["POST"])
async def solve_requirements_async(request):
    """
    Async version of solve_requirements for better performance under load.
    
    POST /api/solve/async/
    """
    try:
        body = json.loads(request.body)
        matching_eval = body.get("matching_eval")
        include_query = body.get("include_query", False)
        
        if matching_eval is None:
            return create_error_response("Missing required field: matching_eval")
        
        is_valid, error_msg = validate_matching_eval(matching_eval)
        if not is_valid:
            return create_error_response(f"Invalid matching_eval structure: {error_msg}")
        
        # Run solver in thread pool to avoid blocking
        result = await sync_to_async(solve)(matching_eval, include_query)
        
        return create_success_response(result.to_dict())
    
    except json.JSONDecodeError as e:
        return create_error_response(f"Invalid JSON: {str(e)}")
    except Exception as e:
        logger.error(f"Error in solve_requirements_async: {str(e)}", exc_info=True)
        return create_error_response(f"Internal server error: {str(e)}", status_code=500)


# ---------------------------------------------------------------------------
# WorksheetMajor CRUD — which (major, specialization) pairs are selected
# for a given worksheet. Mounted under /api/worksheets/<worksheet_pk>/majors/.
# ---------------------------------------------------------------------------

class WorksheetMajorListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/worksheets/<worksheet_pk>/majors/  → list this worksheet's majors
    POST /api/worksheets/<worksheet_pk>/majors/  → add a (major_id, specialization)
    """
    serializer_class = WorksheetMajorSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['worksheet_pk'] = self.kwargs.get('worksheet_pk')
        return ctx

    def get_queryset(self):
        return WorksheetMajor.objects.filter(
            worksheet_id=self.kwargs['worksheet_pk'],
            worksheet__user=self.request.user,
        )

    def perform_create(self, serializer):
        worksheet = get_object_or_404(
            UserWorksheet,
            pk=self.kwargs['worksheet_pk'],
            user=self.request.user,
        )
        serializer.save(worksheet=worksheet)


class WorksheetMajorDetailView(generics.RetrieveDestroyAPIView):
    """
    GET    /api/worksheets/<worksheet_pk>/majors/<pk>/
    DELETE /api/worksheets/<worksheet_pk>/majors/<pk>/
    """
    serializer_class = WorksheetMajorSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerPermission]

    def get_queryset(self):
        return WorksheetMajor.objects.filter(
            worksheet_id=self.kwargs['worksheet_pk'],
            worksheet__user=self.request.user,
        )