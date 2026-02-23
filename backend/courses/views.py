from django.shortcuts import render
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Prefetch
from .models import Course, CourseInstance
from .serializers import CourseSerializer, CourseDetailSerializer

# Create your views here.


class CourseLimitOffsetPagination(LimitOffsetPagination):
    default_limit = 100
    limit_query_param = 'limit'


class CourseListView(generics.ListAPIView):
    serializer_class = CourseSerializer
    pagination_class = CourseLimitOffsetPagination

    def get_queryset(self):
        return Course.objects.prefetch_related(
            # Prefetch(
            'courseinstance_set__course_codes',
            # queryset=CourseInstance.objects.select_related('course')
            # .prefetch_related('course_professors', 'course_codes')
            # ),
            'course_tags',
            'distributionals'
        ).all()


class CourseDetailView(generics.RetrieveAPIView):
    serializer_class = CourseDetailSerializer
    lookup_field = 'external_id'

    queryset = Course.objects.prefetch_related(
        'courseinstance_set__course_professors',
        'distributionals',
        'course_tags',
    )
