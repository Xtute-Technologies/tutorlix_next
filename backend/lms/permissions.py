from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission to only allow admin users.
    """
    message = "Only admin users can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow admin to edit, but anyone to view.
    """
    message = "Only admin users can perform this action."
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrTeacher(permissions.BasePermission):
    """
    Permission to allow admin and teacher users.
    """
    message = "Only admin or teacher users can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['admin', 'teacher']
        )


class IsAdminOrSeller(permissions.BasePermission):
    """
    Permission to allow admin and seller users.
    """
    message = "Only admin or seller users can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['admin', 'seller']
        )


class IsAdminOrTeacherOrReadOnly(permissions.BasePermission):
    """
    Permission to allow admin and teacher to edit, but authenticated users to view.
    """
    message = "Only admin or teacher users can perform this action."
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['admin', 'teacher']
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to only allow owners of an object or admin to edit it.
    """
    message = "Only the owner or admin can perform this action."
    
    def has_object_permission(self, request, view, obj):
        # Admin has all permissions
        if request.user.role == 'admin':
            return True
        
        # Check if object has a user/student/created_by field
        if hasattr(obj, 'student'):
            return obj.student == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsStudent(permissions.BasePermission):
    """
    Permission to only allow student users.
    """
    message = "Only student users can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'student'


class IsTeacher(permissions.BasePermission):
    """
    Permission to only allow teacher users.
    """
    message = "Only teacher users can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'teacher'


class IsSeller(permissions.BasePermission):
    """
    Permission to only allow seller users.
    """
    message = "Only seller users can perform this action."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'seller'
