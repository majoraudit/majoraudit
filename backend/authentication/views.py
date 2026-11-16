from django.http import JsonResponse
from django.middleware.csrf import get_token
from rest_framework import generics, permissions, serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from drf_spectacular.utils import extend_schema, inline_serializer

from .serializers import ProfileSerializer


@extend_schema(responses=inline_serializer(
    name='CsrfToken', fields={'csrfToken': serializers.CharField()},
))
@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
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
