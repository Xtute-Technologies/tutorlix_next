from rest_framework.pagination import PageNumberPagination

class CustomPageNumberPagination(PageNumberPagination):
    # The default page size if the client doesn't specify one
    page_size = 1000  
    
    # The query parameter client uses to request a specific page size
    # e.g., /api/users/?page_size=500
    page_size_query_param = 'page_size'  
    
    # The absolute maximum items allowed per page (security/performance)
    # Even if client asks for 5000, they will only get 2000
    max_page_size = 2000