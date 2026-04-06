import re
from abc import ABC

from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
import json
import os
from pathlib import Path
from rest_framework.exceptions import ValidationError, NotFound, ParseError

import pylibmql

class MajorListView(APIView):
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


class MajorOpView(APIView):
    BASE_DIR = Path("./major_templates").resolve()
    SAFE_NAME = re.compile(r"^[A-Za-z0-9_-]+$")
    
    def validate_name(self, value, field_name):
        if not value:
            raise ValidationError({field_name: "This field is required."})
        if not self.SAFE_NAME.fullmatch(value):
            raise ValidationError({field_name: "Invalid format."})
        return value
    
    def build_safe_path(self, *parts: str) -> Path:
        path = (self.BASE_DIR.joinpath(*parts)).resolve()
        if self.BASE_DIR != path and self.BASE_DIR not in path.parents:
            raise ValidationError("Invalid path.")
        return path

    

class MajorIDView(MajorOpView):
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
    def get(self, request, major_id):
        major_id = self.validate_name(major_id, "major_id")
        specialization = self.validate_name(
            request.query_params.get("specialization"),
            "specialization",
        )

        path = self.build_safe_path(major_id, f"{specialization}.mql")

        if not path.is_file():
            raise NotFound("MQL template not found.")

        try:
            with path.open("r", encoding="utf-8") as f:
                data = f.read()
        except OSError as e:
            raise ParseError(f"Unable to read template file: {e}")

        try:
            result = pylibmql.parse(data).json()
        except Exception as e:
            raise ParseError(f"Malformed MQL: {e}")

        return Response(result)
        

@api_view(['POST'])
def check_major_status(request):
    course_list = request.data.get('courses', [])
    major_id = request.data.get('major_id')
    degree_type = request.data.get('degree_type')
    result = evaluate_major_template(major_id, degree_type, course_list)
    return Response(result)
