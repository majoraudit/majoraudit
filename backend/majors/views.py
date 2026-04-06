from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
import json
import os

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


class MajorIDView(APIView):
    def get(self, request, major_id):
        json_data = open('./major_templates/' + major_id + "/" + major_id + ".json")
        data = json.load(json_data)
        return HttpResponse(json.dumps(data), content_type='application/json')


@api_view(['POST'])
def check_major_status(request):
    course_list = request.data.get('courses', [])
    major_id = request.data.get('major_id')
    degree_type = request.data.get('degree_type')
    result = evaluate_major_template(major_id, degree_type, course_list)
    return Response(result)