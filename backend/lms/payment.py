import razorpay
from django.conf import settings
from rest_framework.exceptions import ValidationError

class PaymentService:
    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_SECRET_ID, settings.RAZORPAY_SECRET_KEY)
        )

    def create_payment_link(self, booking_ref, amount, currency="INR", description="Course Booking", customer_data=None):
        """
        Create a payment link for the booking.
        booking_ref: The internal ID or reference of the booking (e.g., booking ID)
        amount: Amount in decimal/float (will be converted to paisa)
        customer_data: dict containing 'name', 'email', 'contact'
        """
        try:
            # Razorpay expects amount in paisa (integer)
            amount_in_paisa = int(amount * 100)
            
            payload = {
                "amount": amount_in_paisa,
                "currency": currency,
                "accept_partial": False,
                "description": description,
                "reference_id": str(booking_ref),
                "customer": {
                    "name": customer_data.get('name', ''),
                    "contact": customer_data.get('contact', ''),
                    "email": customer_data.get('email', '')
                },
                "notify": {
                    "sms": True,
                    "email": True
                },
                "reminder_enable": True,
                "callback_url": f"{settings.FRONTEND_URL}/payment-success",
                "callback_method": "get"
            }
            
            payment_link = self.client.payment_link.create(payload)
            return payment_link
            
        except Exception as e:
            raise ValidationError(f"Error generating payment link: {str(e)}")

    def verify_payment_signature(self, params_dict):
        try:
            self.client.utility.verify_payment_link_signature(params_dict)
            return True
        except Exception as e:
            return False

    def create_order(self, amount, currency="INR", receipt=None, notes=None):
        try:
            amount_in_paisa = int(amount * 100)
            data = {
                "amount": amount_in_paisa,
                "currency": currency,
                "receipt": str(receipt),
                "notes": notes or {}
            }
            order = self.client.order.create(data=data)
            return order
        except Exception as e:
            raise ValidationError(f"Error creating Razorpay order: {str(e)}")

    def verify_order_signature(self, params_dict):
        """
        Verify signature for Standard Checkout (Order-based)
        params_dict must contain: razorpay_order_id, razorpay_payment_id, razorpay_signature
        """
        try:
            self.client.utility.verify_payment_signature(params_dict)
            return True
        except Exception:
            return False


    def verify_webhook_signature(self, body, signature):
        try:
            # Use webhook secret from settings
            self.client.utility.verify_webhook_signature(body, signature, settings.RAZORPAY_WEBHOOK_SECRET)
            return True
        except Exception:
            return False
