from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET
from rest_framework import generics, permissions

from .serializers import ProfileSerializer


@require_GET
def csrf_token(request):
    """Return a CSRF token that cross-origin frontends can read from JSON."""
    return JsonResponse({"csrfToken": get_token(request)})


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/auth/profile/ → return the current user's profile
    PATCH /api/auth/profile/ → update editable fields (class_year,
                               intended_language_code, language_requirement)
    """
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return self.request.user
