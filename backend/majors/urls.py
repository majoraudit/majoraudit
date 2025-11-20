from django.urls import path
from .views import MajorIDView

urlpatterns = [
    # path('', CourseListView.as_view(), name='course-list'),
    path('/api/majors/<major_id>', MajorIDView.as_view(), name='major-id')
]
