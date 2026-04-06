from django.urls import path
from .views import MajorListView, MajorIDView, MajorIDMQLView, check_major_status

urlpatterns = [
    path('', MajorListView.as_view(), name='major-list'),
    path('check/', check_major_status, name='check-major-status'),
    path('<str:major_id>/', MajorIDView.as_view(), name='major-id'),
    path('<str:major_id>/mql', MajorIDMQLView.as_view(), name='major-id-mql')
]
