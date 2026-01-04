from allauth.account.adapter import DefaultAccountAdapter


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom adapter to allow authentication with email or phone number
    """
    
    def save_user(self, request, user, form, commit=True):
        """
        Saves a new `User` instance using information provided in the
        signup form.
        """
        user = super().save_user(request, user, form, commit=False)
        
        # Get additional fields from the serializer
        data = getattr(form, 'cleaned_data', {})
        
        # If using dj-rest-auth, get data from the request
        if not data and hasattr(request, 'data'):
            data = request.data
        
        user.phone = data.get('phone', '')
        user.state = data.get('state', '')
        user.role = data.get('role', 'student')
        
        if commit:
            user.save()
        
        return user
