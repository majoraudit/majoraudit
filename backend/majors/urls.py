from django.urls import path
from . import views

urlpatterns = [
    path('', views.MajorListView.as_view(), name='major-list'),
    path('check/', views.check_major_status, name='check-major-status'),
    path('<str:major_id>/', views.MajorIDView.as_view(), name='major-id'),
    path('<str:major_id>/mql', views.MajorIDMQLView.as_view(), name='major-id-mql'),
    
    path('solve/', views.solve_requirements, name='solve'),
    path('solve/detailed/', views.solve_requirements_detailed, name='solve_detailed'),
    
    # Solver endpoints - class-based views
    path('solver/', views.SolverView.as_view(), name='solver'),
    path('solver/batch/', views.BatchSolverView.as_view(), name='batch_solver'),
]
