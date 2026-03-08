from django.urls import path
from .views import CourseListView, CourseDetailView, CourseTableDetailProxyView

urlpatterns = [
    path('', CourseListView.as_view(), name='course-list'),
    path('coursetable/', CourseTableDetailProxyView.as_view(),
         name='course-coursetable-proxy'),
    path('<int:external_id>/', CourseDetailView.as_view(), name='course-detail'),
]
