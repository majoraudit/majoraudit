from django.urls import path
from .views import MajorListView, MajorIDView, MajorPreviewView

urlpatterns = [
    path('', MajorListView.as_view(), name='major-list'),
    path('<str:major_id>/<str:degree_type>/preview/',
         MajorPreviewView.as_view(), name='major-preview'),
    path('<str:major_id>/', MajorIDView.as_view(), name='major-id'),
]
