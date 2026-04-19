from decimal import Decimal
from datetime import timedelta
from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Q, Count
from django.conf import settings
from django.utils import timezone
import logging

from .models import Note, NoteAttachment, NotePurchase, NoteAccess, NoteAISubscription, NoteAIDoubt
from .serializers import (
    NoteListSerializer,
    NoteDetailSerializer,
    NoteCreateUpdateSerializer,
    NoteAttachmentSerializer,
    NotePurchaseSerializer,
    NoteAccessSerializer,
    NoteAISubscriptionSerializer,
    NoteAIDoubtSerializer,
)
from .services import GroqNoteAIService
from lms.models import Product, CourseBooking
from lms.payment import PaymentService

logger = logging.getLogger(__name__)


class NoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Notes CRUD operations.
    - Public: Can list published notes (limited fields)
    - Student: Can view notes they have access to
    - Teacher: Can manage their own notes and notes for assigned products
    - Admin: Full access
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['note_type', 'privacy', 'is_draft', 'is_active', 'creator', 'product']
    search_fields = ['title', 'description', 'creator__email', 'creator__first_name', 'creator__last_name']
    ordering_fields = ['created_at', 'updated_at', 'title', 'price']
    ordering = ['-created_at']
    lookup_field = 'slug'
    lookup_value_regex = '[^/]+'
    
    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get the lookup value from URL kwargs
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        # 1. Try lookup by slug first
        filter_kwargs = {self.lookup_field: lookup_value}
        try:
             obj = queryset.get(**filter_kwargs)
        except (queryset.model.DoesNotExist, ValueError):
             obj = None

        # 2. If not found via slug, try lookup by ID (pk) if value looks like an integer
        if obj is None and lookup_value and str(lookup_value).isdigit():
             filter_kwargs = {'pk': lookup_value}
             try:
                 obj = queryset.get(**filter_kwargs)
             except queryset.model.DoesNotExist:
                 pass
        
        if obj is None:
            from django.http import Http404
            raise Http404

        # Check object permissions
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=False, methods=['get'], url_path='public/browse')
    def public_browse(self, request):
        queryset = Note.objects.filter(
            is_draft=False,
            is_active=True,
            note_type='individual', 
            privacy__in=['public', 'purchaseable', 'logged_in']
        ).select_related('creator', 'product').order_by('-created_at')

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search)
            )

        # Profile Type Filtering
        profile_type = request.query_params.get('profile_type')
        if profile_type:
             queryset = queryset.filter(profileTypes__icontains=profile_type)
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = NoteListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = NoteListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='public_detail')
    def public_detail(self, request, slug=None):
        try:
            note = Note.objects.get(
                slug=slug,
                is_draft=False,
                is_active=True
            )
        except Note.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = NoteDetailSerializer(note, context={'request': request})
        return Response(serializer.data)
    
    def get_queryset(self):
        user = self.request.user
        queryset = Note.objects.select_related('creator', 'product').prefetch_related('attachments')
        
        if not user.is_authenticated:
            return queryset.filter(            
                is_draft=False,
                is_active=True,
                note_type='individual',
                privacy='public')

        # Admin sees all notes
        if user.role == 'admin':
            return queryset
        
        # Teacher sees their own notes + notes for products they teach
        if user.role == 'teacher':
            return queryset.filter(
                Q(creator=user) |
                Q(product__instructors=user)
            ).distinct()
        
        # Students see only published, active notes they can access
        if user.role == 'student':
            view_mode = self.request.query_params.get('view_mode')

            # 1. Public & Logged In (For Explore)
            public_logged_in = Q(
                is_draft=False,
                is_active=True,
                note_type='individual',
                privacy__in=['public', 'logged_in']
            )
            
            # 2. Course Specific (For Mine - requires enrollment)
            active_products = CourseBooking.objects.filter(
                student=user,
                payment_status='paid',
            ).exclude(
                student_status__in=['inactive', 'cancelled']
            ).filter(
                Q(course_expiry_date__isnull=True) |
                Q(course_expiry_date__gte=timezone.localdate())
            ).values_list('product_id', flat=True)
            
            course_notes = Q(
                is_draft=False,
                is_active=True,
                note_type='course_specific',
                product_id__in=active_products
            )
            
            # 3. Purchaseable (Split into Owned / Unowned)
            accessible_note_ids = NoteAccess.objects.filter(
                student=user,
                is_active=True
            ).values_list('note_id', flat=True)
            
            # Notes the student has access to (Purchased OR Free Enrollment)
            my_individual_notes = Q(
                is_draft=False,
                is_active=True,
                note_type='individual',
                id__in=accessible_note_ids
            )
            
            unpurchased_notes = Q(
                is_draft=False,
                is_active=True,
                note_type='individual',
                privacy='purchaseable'
            ) & ~Q(id__in=accessible_note_ids)

            if view_mode == 'mine':
                # Shows Purchased/Enrolled notes and Course-specific notes
                return queryset.filter(course_notes | my_individual_notes).distinct()
            
            if view_mode == 'explore':
                 # Shows Public, Logged In, and Purchaseable notes not yet bought
                return queryset.filter(public_logged_in | unpurchased_notes).distinct()

            return queryset.filter(
                public_logged_in | course_notes | my_individual_notes | unpurchased_notes
            ).distinct()
        
        # Default: only published, public notes (for unauthenticated users)
        return queryset.filter(
            is_draft=False,
            is_active=True,
            note_type='individual',
            privacy='public'
        )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NoteListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return NoteCreateUpdateSerializer
        return NoteDetailSerializer
    
    def get_permissions(self):
        # Public listing for these actions
        if self.action in ['list', 'retrieve', 'public_notes', 'public_browse', 'public_detail']:
            return [AllowAny()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        note_type = serializer.validated_data.get('note_type', 'individual')
        extra_data = {}
        
        # Determine creator
        if self.request.user.role == 'admin':
            # Admin can specify creator, otherwise defaults to self
            if 'creator' not in serializer.validated_data:
                extra_data['creator'] = self.request.user
        else:
            # Non-admins always create as themselves
            extra_data['creator'] = self.request.user

        if note_type == 'course_specific':
            extra_data['price'] = 0
            extra_data['discounted_price'] = None
            extra_data['is_draft'] = False
        elif note_type == 'individual':
            extra_data['product'] = None

        serializer.save(**extra_data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None, slug=None):
        """
        Enroll in a note (free enrollment for public/logged-in notes)
        """
        note = self.get_object()
        user = request.user
        
        # Check if already enrolled or has access
        if note.can_user_access(user):
            return Response({"detail": "Already accessed/enrolled"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create access
        NoteAccess.objects.create(
            student=user,
            note=note,
            access_type='free_enrollment',
            is_active=True
        )
        return Response({"detail": "Enrolled successfully"}, status=status.HTTP_201_CREATED)
        
        # if user.role == 'teacher':
        #      # Teachers see access for their notes
        #     return queryset.filter(note__creator=user)
            
        return NoteAccess.objects.none()
    
    def perform_update(self, serializer):
        # 1. Permission Check: Ensure only creator or admin can update
        note = self.get_object()
        user = self.request.user
        
        if user.role != 'admin' and note.creator != user:
            # Check if user is instructor of the product
            if not (note.product and note.product.instructors.filter(id=user.id).exists()):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You don't have permission to edit this note.")
        
        # 2. Logic for note_type and privacy cleaning
        new_note_type = serializer.validated_data.get('note_type')
        final_note_type = new_note_type if new_note_type is not None else note.note_type
        
        new_privacy = serializer.validated_data.get('privacy')
        final_privacy = new_privacy if new_privacy is not None else note.privacy
        
        extra_data = {}
        
        # 3. Prevent creator spoofing for non-admins
        if user.role != 'admin' and 'creator' in serializer.validated_data:
             serializer.validated_data.pop('creator')
        
        # 4. Clean pricing based on Privacy or Type
        # Logic: If it's linked to a course OR not set to 'purchaseable', it must be free.
        if final_note_type == 'course_specific' or final_privacy != 'purchaseable':
            extra_data['price'] = 0
            extra_data['discounted_price'] = None

        if final_note_type == 'course_specific':
            extra_data['is_draft'] = False
            
        # 5. Clean product link if individual
        if final_note_type == 'individual':
            extra_data['product'] = None

        serializer.save(**extra_data)


        
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def public_notes(self, request):
        """
        Public endpoint for listing published notes (for non-authenticated users)
        Shows individual notes with public, logged_in, or purchaseable privacy (Marketplace view)
        """
        queryset = Note.objects.filter(
            is_draft=False,
            is_active=True,
            note_type='individual'
        ).filter(
            Q(privacy='public') | Q(privacy='logged_in') | Q(privacy='purchaseable')
        ).select_related('creator', 'product')
        
        # Apply filters
        note_type = request.query_params.get('note_type')
        if note_type:
            queryset = queryset.filter(note_type=note_type)
        
        product_id = request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        # Paginate
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = NoteListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = NoteListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def check_access(self, request, pk=None):
        """
        Check if current user can access this note
        Endpoint: /api/notes/{id}/check_access/
        """
        note = self.get_object()
        user = request.user
        
        can_access = note.can_user_access(user) if user.is_authenticated else False
        has_purchased = False
        
        if user.is_authenticated and user.role == 'student':
            has_purchased = NotePurchase.objects.filter(
                student=user,
                note=note,
                payment_status='paid'
            ).exists()
        
        return Response({
            'can_access': can_access,
            'has_purchased': has_purchased,
            'note_type': note.note_type,
            'privacy': note.privacy,
            'requires_purchase': note.privacy == 'purchaseable' and not can_access
        })

    @action(detail=True, methods=['get'], permission_classes=[AllowAny], url_path='ai-status')
    def ai_status(self, request, pk=None):
        note = self.get_object()
        user = request.user
        subscription = note.get_active_ai_subscription(user) if user.is_authenticated else None

        return Response({
            'ask_ai_enabled': note.ask_ai_enabled,
            'ask_ai_monthly_price': note.get_ask_ai_monthly_price(),
            'can_access_note': note.can_user_access(user) if user.is_authenticated else False,
            'has_ai_subscription': note.has_active_ai_subscription(user) if user.is_authenticated else False,
            'ai_subscription_valid_until': subscription.valid_until if subscription else None,
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='ask-ai')
    def ask_ai(self, request, pk=None):
        note = self.get_object()
        user = request.user

        if not note.ask_ai_enabled:
            return Response(
                {'error': 'Ask AI is not enabled for this note.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role != 'student':
            return Response(
                {'error': 'Only students can use Ask AI for notes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not note.can_user_access(user):
            return Response(
                {'error': 'Get note access before using Ask AI.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not note.can_user_ask_ai(user):
            return Response(
                {'error': 'An active Ask AI subscription is required for this note.'},
                status=status.HTTP_403_FORBIDDEN
            )

        question = (request.data.get('question') or '').strip()
        if not question:
            return Response(
                {'error': 'question is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = GroqNoteAIService()
        result = service.answer_note_question(note, question)

        doubt = NoteAIDoubt.objects.create(
            note=note,
            student=user,
            question=question,
            answer=result['answer'],
            model_name=result['model_name'],
        )

        return Response(NoteAIDoubtSerializer(doubt).data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_notes(self, request):
        """
        Get notes created by the current user (for teachers/admin)
        """
        user = request.user
        
        if user.role not in ['teacher', 'admin']:
            return Response(
                {'error': 'Only teachers and admins can access this endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = Note.objects.filter(creator=user).select_related('product')
        
        # Apply standard filters (is_draft, note_type, product, etc.)
        queryset = self.filter_queryset(queryset)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = NoteListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = NoteListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_image(self, request):
        """
        Upload file for BlockNote editor (Images & Documents)
        Endpoint: POST /api/notes/upload_image/
        """
        user = request.user
        
        if user.role not in ['teacher', 'admin']:
            return Response(
                {'error': 'Only teachers and admins can upload files.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check for 'image' or 'file' key
        uploaded_file = request.FILES.get('image') or request.FILES.get('file')
        
        if not uploaded_file:
            return Response(
                {'error': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Allowed MIME types
        allowed_types = [
            # Images
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            # Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', # docx
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', # xlsx
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', # pptx
            'text/plain',
            'application/zip',
            'application/x-zip-compressed'
        ]
        
        if uploaded_file.content_type not in allowed_types:
            # Fallback check for extensions if mime type is generic/octet-stream
            import os
            ext = os.path.splitext(uploaded_file.name)[1].lower()
            allowed_extensions = [
                '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip'
            ]
            
            if ext not in allowed_extensions:
                 return Response(
                    {'error': f'Invalid file type ({uploaded_file.content_type}). Allowed: Images, PDF, Office Docs, Zip.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate file size (max 50MB for editor uploads)
        max_size = 50 * 1024 * 1024 
        if uploaded_file.size > max_size:
            return Response(
                {'error': 'File size too large. Maximum 50MB allowed for editor uploads.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save the file
        import os
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        
        # Generate unique filename
        ext = os.path.splitext(uploaded_file.name)[1]
        timestamp = int(timezone.now().timestamp())
        # Store in 'uploads' instead of 'images' to be semantically correct, 
        # but keep compatibility if anything relies on path structure (unlikely)
        filename = f'notes/uploads/{user.id}_{timestamp}{ext}'
        
        path = default_storage.save(filename, ContentFile(uploaded_file.read()))
        url = request.build_absolute_uri(default_storage.url(path))
        
        return Response({'url': url}, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def analytics(self, request):
        """
        Get analytics for notes created by the current user
        Endpoint: /api/notes/analytics/
        """
        user = request.user
        
        if user.role not in ['teacher', 'admin']:
            return Response(
                {'error': 'Only teachers and admins can access analytics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Filter notes by creator
        notes_filter = {'note__creator': user} if user.role == 'teacher' else {}
        
        # Total notes created
        total_notes = Note.objects.filter(creator=user).count() if user.role == 'teacher' else Note.objects.count()
        
        # Published notes
        published_notes = Note.objects.filter(
            creator=user, is_draft=False, is_active=True
        ).count() if user.role == 'teacher' else Note.objects.filter(is_draft=False, is_active=True).count()
        
        # Purchase statistics
        purchases = NotePurchase.objects.filter(**notes_filter, payment_status='paid')
        
        total_purchases = purchases.count()
        total_revenue = purchases.aggregate(
            revenue=Sum('final_amount')
        )['revenue'] or Decimal(0)
        
        # Top performing notes
        top_notes = NotePurchase.objects.filter(
            **notes_filter,
            payment_status='paid'
        ).values(
            'note__id',
            'note__title'
        ).annotate(
            purchase_count=Count('id'),
            revenue=Sum('final_amount')
        ).order_by('-revenue')[:5]
        
        return Response({
            'total_notes': total_notes,
            'published_notes': published_notes,
            'total_purchases': total_purchases,
            'total_revenue': float(total_revenue),
            'top_notes': list(top_notes)
        })


class NoteAttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Note Attachments
    """
    queryset = NoteAttachment.objects.all()
    serializer_class = NoteAttachmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['note']
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Admin sees all
        if user.role == 'admin':
            return queryset
        
        # Teachers see attachments for their notes
        if user.role == 'teacher':
            return queryset.filter(
                Q(note__creator=user) |
                Q(note__product__instructors=user)
            ).distinct()
        
        # Students see attachments for notes they can access
        return queryset.filter(note__accesses__student=user, note__accesses__is_active=True).distinct()
    
    def perform_create(self, serializer):
        # Ensure user has permission to add attachments to the note
        note = serializer.validated_data.get('note')
        user = self.request.user
        
        # Check explicit permission
        if user.role != 'admin' and note.creator != user:
            # Teachers can add attachments to notes for products they teach
            if not (note.product and note.product.instructors.filter(id=user.id).exists()):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You don't have permission to add attachments to this note.")
        
        # Check attachment count limit (Max 5)
        if note.attachments.count() >= 5:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Maximum 5 attachments allowed per note.")

        serializer.save()


class NotePurchaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Note Purchases
    - Admin: Full access
    - Teacher: View purchases for their notes
    - Student: View their own purchases
    """
    queryset = NotePurchase.objects.all()
    serializer_class = NotePurchaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['payment_status', 'student', 'note']
    search_fields = ['student__email', 'note__title', 'purchase_id', 'razorpay_order_id']
    ordering_fields = ['created_at', 'payment_date', 'final_amount']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().select_related('student', 'note')
        
        if user.role == 'admin':
            return queryset
        
        if user.role == 'teacher':
            return queryset.filter(note__creator=user)
        
        if user.role == 'student':
            return queryset.filter(student=user)
        
        return queryset.none()
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def initiate_purchase(self, request):
        """
        Initiate a note purchase
        Endpoint: POST /api/notes/purchases/initiate_purchase/
        """
        user = request.user
        
        if user.role != 'student':
            return Response(
                {'error': 'Only students can purchase notes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        note_id = request.data.get('note_id')
        
        if not note_id:
            return Response(
                {'error': 'note_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            note = Note.objects.get(id=note_id, is_active=True, is_draft=False)
        except Note.DoesNotExist:
            return Response(
                {'error': 'Note not found or not available for purchase.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already purchased (any status)
        existing_purchase = NotePurchase.objects.filter(
            student=user,
            note=note
        ).first()
        
        if existing_purchase and existing_purchase.payment_status == 'paid' and existing_purchase.is_access_valid():
            return Response(
                {'error': 'You have already purchased this note.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate amount
        final_amount = note.get_effective_price()
         # Determine Status - if 0 price, auto-approve
        is_free = final_amount <= 0
        status_val = 'paid' if is_free else 'pending'
        
        defaults = {
            'price': note.price,
            'discount_amount': note.price - final_amount if note.discounted_price else 0,
            'final_amount': final_amount,
            'payment_status': status_val,
            'purchased_by': user.get_full_name()
        }

        # Update or Create
        if existing_purchase:
            purchase = existing_purchase
            for key, value in defaults.items():
                setattr(purchase, key, value)
            purchase.save()
        else:
             purchase = NotePurchase.objects.create(
                student=user,
                note=note,
                **defaults
            )
        
        if is_free:
             # Create access immediately
            NoteAccess.objects.get_or_create(
                student=user,
                note=note,
                access_type='purchase',
                defaults={
                    'purchase': purchase,
                    'is_active': True
                }
            )
             # No payment link needed for free
            purchase.payment_link = None
        else:
            # 1. Create Razorpay Order
            payment_service = PaymentService()
            try:
                # Always create a fresh order for a new initiation/retry
                order = payment_service.create_order(
                    amount=float(final_amount),
                    currency="INR",
                    receipt=str(purchase.purchase_id),
                    notes={
                        "purchase_id": str(purchase.purchase_id), # Crucial for webhook
                        "type": "note_purchase",
                        "student_id": user.id
                    }
                )
                
                purchase.razorpay_order_id = order.get('id')
                # 2. Return link to internal payment page
                purchase.payment_link = (
                    f"{settings.FRONTEND_URL}/public-payment/{purchase.purchase_id}?type=note"
                )
                # Ensure we save the new order ID
                purchase.save()
                
            except Exception as e:
                # Log error
                logger.error(f"Failed to create Razorpay order for note purchase {purchase.purchase_id}: {e}")
                return Response(
                    {'error': 'Failed to initiate payment gateway.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        serializer = self.get_serializer(purchase)
        return Response(serializer.data, status=status.HTTP_200_OK if existing_purchase else status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='details_public/(?P<uuid>[^/.]+)')
    def get_payment_details(self, request, uuid=None):
        """
        Get payment details for a purchase (public endpoint for payment page)
        """
        try:
            purchase = NotePurchase.objects.select_related('note', 'student').get(purchase_id=uuid)
        except NotePurchase.DoesNotExist:
            return Response(
                {'error': 'Purchase not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # If already paid, return status
        if purchase.payment_status in ['paid', 'completed']:
            return Response({
                "purchase": NotePurchaseSerializer(purchase).data,
                "status": purchase.payment_status,
                "message": "This note has already been purchased."
            })
        
        # Create Razorpay order if not exists (Should be created on initiate, but retry logic here)
        service = PaymentService()
        order_id = purchase.razorpay_order_id
        
        if not order_id:
            try:
                order = service.create_order(
                    amount=float(purchase.final_amount),
                    currency='INR',
                    receipt=str(purchase.purchase_id),
                    notes={
                        'purchase_id': str(purchase.purchase_id),
                        'type': 'note_purchase'
                    }
                )
                purchase.razorpay_order_id = order['id']
                purchase.save()
                order_id = order['id']
            except Exception as e:
                logger.error(f"Failed to create Razorpay order: {e}")
                return Response(
                    {'error': 'Failed to create payment order.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Prepare response for frontend checkout
        return Response({
            "key": settings.RAZORPAY_SECRET_ID, # Public Key
            "amount": purchase.final_amount * 100, # paise
            "currency": "INR",
            "name": "Tutorlix",
            "description": f"Purchase Note: {purchase.note.title}",
            "order_id": order_id,
            "purchase_id": str(purchase.purchase_id),
            "note_id": purchase.note.id,
            "prefill": {
                "name": purchase.student.get_full_name(),
                "email": purchase.student.email,
                "contact": getattr(purchase.student, 'phone', '')
            },
            "theme": {
                "color": "#3399cc"
            }
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='verify_payment')
    def verify_payment(self, request):
        """
        Verify payment signature and update purchase status
        """
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
             return Response({'error': 'Missing payment parameters'}, status=status.HTTP_400_BAD_REQUEST)
             

        service = PaymentService()
        if not service.verify_order_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }):
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            purchase = NotePurchase.objects.get(razorpay_order_id=razorpay_order_id)
        except NotePurchase.DoesNotExist:
            return Response({'error': 'Purchase not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if purchase.payment_status == 'paid':
             return Response({'status': 'success', 'message': 'Already paid'})
             
        # Update Purchase
        purchase.payment_status = 'paid'
        purchase.payment_date = timezone.now()
        purchase.razorpay_payment_id = razorpay_payment_id
        purchase.razorpay_signature = razorpay_signature
        purchase.save()
        
        # Grant Access
        NoteAccess.objects.get_or_create(
            student=purchase.student,
            note=purchase.note,
            access_type='purchase',
            defaults={
                'purchase': purchase,
                'is_active': True
            }
        )
        
        return Response({'status': 'success'})


class NoteAISubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Ask AI subscriptions on notes.
    """
    queryset = NoteAISubscription.objects.all()
    serializer_class = NoteAISubscriptionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['payment_status', 'student', 'note']
    ordering_fields = ['created_at', 'updated_at', 'valid_until']
    ordering = ['-updated_at']

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().select_related('student', 'note')
        if user.role == 'admin':
            return queryset
        if user.role == 'teacher':
            return queryset.filter(note__creator=user)
        if user.role == 'student':
            return queryset.filter(student=user)
        return queryset.none()

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='initiate_subscription')
    def initiate_subscription(self, request):
        user = request.user
        if user.role != 'student':
            return Response(
                {'error': 'Only students can subscribe to Ask AI.'},
                status=status.HTTP_403_FORBIDDEN
            )

        note_id = request.data.get('note_id')
        if not note_id:
            return Response({'error': 'note_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            note = Note.objects.get(id=note_id, is_active=True, is_draft=False)
        except Note.DoesNotExist:
            return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not note.ask_ai_enabled:
            return Response(
                {'error': 'Ask AI is not enabled for this note.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not note.can_user_access(user):
            return Response(
                {'error': 'Get note access before subscribing to Ask AI.'},
                status=status.HTTP_403_FORBIDDEN
            )

        active_subscription = note.get_active_ai_subscription(user)
        if active_subscription:
            return Response(
                {'error': 'You already have an active Ask AI subscription for this note.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        price = note.get_ask_ai_monthly_price()
        if price <= 0:
            return Response(
                {'error': 'Invalid Ask AI price configured for this note.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subscription, _ = NoteAISubscription.objects.get_or_create(
            student=user,
            note=note,
            defaults={
                'monthly_price': price,
                'final_amount': price,
                'payment_status': 'pending',
            }
        )
        subscription.monthly_price = price
        subscription.final_amount = price
        subscription.payment_status = 'pending'
        subscription.payment_link = None
        subscription.payment_date = None

        payment_service = PaymentService()
        try:
            order = payment_service.create_order(
                amount=float(price),
                currency="INR",
                receipt=str(subscription.subscription_id),
                notes={
                    "subscription_id": str(subscription.subscription_id),
                    "type": "note_ai_subscription",
                    "student_id": user.id,
                    "note_id": note.id,
                }
            )
            subscription.razorpay_order_id = order.get('id')
            subscription.payment_link = (
                f"{settings.FRONTEND_URL}/public-payment/{subscription.subscription_id}?type=note-ai"
            )
            subscription.save()
        except Exception as e:
            logger.error(f"Failed to create Razorpay order for note AI subscription {subscription.subscription_id}: {e}")
            return Response(
                {'error': 'Failed to initiate payment gateway.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='details_public/(?P<uuid>[^/.]+)')
    def get_payment_details(self, request, uuid=None):
        try:
            subscription = NoteAISubscription.objects.select_related('note', 'student').get(subscription_id=uuid)
        except NoteAISubscription.DoesNotExist:
            return Response({'error': 'Subscription not found.'}, status=status.HTTP_404_NOT_FOUND)

        if subscription.is_active():
            return Response({
                "subscription": NoteAISubscriptionSerializer(subscription).data,
                "status": subscription.payment_status,
                "message": "Your Ask AI subscription is already active."
            })

        service = PaymentService()
        order_id = subscription.razorpay_order_id

        if not order_id:
            try:
                order = service.create_order(
                    amount=float(subscription.final_amount),
                    currency='INR',
                    receipt=str(subscription.subscription_id),
                    notes={
                        'subscription_id': str(subscription.subscription_id),
                        'type': 'note_ai_subscription',
                        'note_id': subscription.note.id,
                    }
                )
                subscription.razorpay_order_id = order['id']
                subscription.save()
                order_id = order['id']
            except Exception as e:
                logger.error(f"Failed to create Razorpay order for note AI subscription: {e}")
                return Response(
                    {'error': 'Failed to create payment order.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response({
            "key": settings.RAZORPAY_SECRET_ID,
            "amount": subscription.final_amount * 100,
            "currency": "INR",
            "name": "Tutorlix",
            "description": f"Ask AI Subscription: {subscription.note.title}",
            "order_id": order_id,
            "subscription_id": str(subscription.subscription_id),
            "note_id": subscription.note.id,
            "prefill": {
                "name": subscription.student.get_full_name(),
                "email": subscription.student.email,
                "contact": getattr(subscription.student, 'phone', '')
            },
            "theme": {
                "color": "#3399cc"
            }
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='verify_payment')
    def verify_payment(self, request):
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
            return Response({'error': 'Missing payment parameters'}, status=status.HTTP_400_BAD_REQUEST)

        service = PaymentService()
        if not service.verify_order_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }):
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subscription = NoteAISubscription.objects.select_related('note').get(razorpay_order_id=razorpay_order_id)
        except NoteAISubscription.DoesNotExist:
            return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        if subscription.payment_status == 'paid' and subscription.valid_until and subscription.valid_until > now:
            return Response({
                'status': 'success',
                'note_id': subscription.note.id,
                'valid_until': subscription.valid_until,
            })

        base_time = subscription.valid_until if subscription.valid_until and subscription.valid_until > now else now
        subscription.payment_status = 'paid'
        subscription.payment_date = now
        subscription.razorpay_payment_id = razorpay_payment_id
        subscription.razorpay_signature = razorpay_signature
        subscription.valid_until = base_time + timedelta(days=30)
        subscription.save()

        return Response({
            'status': 'success',
            'note_id': subscription.note.id,
            'valid_until': subscription.valid_until,
        })


class NoteAccessViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Note Access Management (Admin only)
    """
    queryset = NoteAccess.objects.all()
    serializer_class = NoteAccessSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['access_type', 'is_active', 'student', 'note']
    search_fields = ['student__email', 'note__title']
    ordering_fields = ['created_at', 'valid_until']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().select_related('student', 'note', 'granted_by')
        
        if user.role == 'admin':
            return queryset
        
        # Teachers can see access records for their notes
        if user.role == 'teacher':
            return queryset.filter(note__creator=user)
        
        # Students can see their own access records
        if user.role == 'student':
            return queryset.filter(student=user)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        # Only admins can manually create access records
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can manually grant note access.")
        
        serializer.save(
            granted_by=self.request.user
        )
