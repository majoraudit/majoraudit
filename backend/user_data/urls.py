from django.urls import path
from .views import (
    UserInfoView,
    UserMajorListCreateView,
    UserMajorDetailView,
)

urlpatterns = [
    path('info/', UserInfoView.as_view(), name='user-info'),
    path('majors/', UserMajorListCreateView.as_view(), name='user-majors-list'),
    path('majors/<int:pk>/', UserMajorDetailView.as_view(), name='user-majors-detail'),
]