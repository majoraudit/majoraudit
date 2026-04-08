from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import UserInfo, UserMajor
from .serializers import UserInfoSerializer, UserMajorSerializer


class UserInfoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get or create UserInfo for the current user
        info, _ = UserInfo.objects.get_or_create(user=request.user)
        serializer = UserInfoSerializer(info)
        return Response(serializer.data)

    def put(self, request):
        info, _ = UserInfo.objects.get_or_create(user=request.user)
        serializer = UserInfoSerializer(info, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        return self.put(request)


class UserMajorListCreateView(generics.ListCreateAPIView):
    serializer_class = UserMajorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserMajor.objects.filter(user=self.request.user).order_by('added_at')

    def get_queryset(self):
        return UserMajor.objects.filter(user=self.request.user).order_by('added_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserMajorDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = UserMajorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserMajor.objects.filter(user=self.request.user)