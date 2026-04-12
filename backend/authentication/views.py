from rest_framework import generics, permissions

from .serializers import ProfileSerializer


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
