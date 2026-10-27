# authentication/urls.py

from django.urls import path
from django_cas_ng.views import LoginView, LogoutView
from . import views

urlpatterns = [
    path('login/', LoginView.as_view(), name='cas_ng_login'),
    path('logout/', LogoutView.as_view(), name='cas_ng_logout'),
    path("csrf/", views.csrf_token, name="csrf-token"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
]
