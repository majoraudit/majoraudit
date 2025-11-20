from django.shortcuts import render
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Prefetch
from .models import Course, CourseInstance
from django.http import HttpResponse
import json

# Create your views here.

class MajorIDView(generics.ListAPIView):

    def get_queryset(self, major_id):
        json_data = open('./major_templates/' + major_id + "/" + major_id + ".json")   
        data = json.load(json_data) 
        return HttpResponse(json.dumps(data), content_type='application/json')