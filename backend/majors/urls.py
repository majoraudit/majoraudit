from django.urls import path
from . import views

urlpatterns = [
    path("", views.MajorListView.as_view(), name="major-list"),
    path("<str:major_id>/", views.MajorDetailView.as_view(), name="major-detail"),
    path("<str:major_id>/programs/<str:program_id>/", views.ProgramDetailView.as_view(), name="program-detail"),
]
