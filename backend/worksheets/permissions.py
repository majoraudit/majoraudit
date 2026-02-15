from rest_framework import permissions


class IsOwnerPermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'worksheet'):
            return obj.worksheet.user == request.user
        elif hasattr(obj, 'worksheet_semester'):
            return obj.worksheet_semester.worksheet.user == request.user
        return False