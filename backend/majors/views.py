from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from backend.major_templates.mql_parser import evaluate_major_template

@api_view(['POST'])
def check_major_status(request):
    course_list = request.data.get('courses', [])
    major_id = request.data.get('major_id')
    degree_type = request.data.get('degree_type')  # e.g., "bs", "bs_intensive"

    result = evaluate_major_template(major_id, degree_type, course_list)
    return Response(result)