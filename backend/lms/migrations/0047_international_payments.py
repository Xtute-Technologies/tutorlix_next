from django.db import migrations, models


def seed_payment_snapshots(apps, schema_editor):
    CourseBooking = apps.get_model("lms", "CourseBooking")
    PaymentHistory = apps.get_model("lms", "PaymentHistory")
    AdhocPayment = apps.get_model("lms", "AdhocPayment")
    AdhocPaymentHistory = apps.get_model("lms", "AdhocPaymentHistory")

    CourseBooking.objects.filter(payment_amount__isnull=True).update(
        payment_currency="INR",
        payment_amount=models.F("final_amount"),
    )
    PaymentHistory.objects.filter(charged_amount__isnull=True).update(
        currency="INR",
        charged_amount=models.F("amount"),
    )
    AdhocPayment.objects.filter(payment_amount__isnull=True).update(
        payment_currency="INR",
        payment_amount=models.F("amount"),
    )
    AdhocPaymentHistory.objects.filter(charged_amount__isnull=True).update(
        currency="INR",
        charged_amount=models.F("amount"),
    )


class Migration(migrations.Migration):

    dependencies = [
        ("lms", "0046_adhocpayment_adhocpaymenthistory"),
    ]

    operations = [
        migrations.AddField(
            model_name="coursebooking",
            name="international_student",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="coursebooking",
            name="payment_currency",
            field=models.CharField(
                choices=[("INR", "Indian Rupee"), ("USD", "US Dollar")],
                default="INR",
                max_length=3,
            ),
        ),
        migrations.AddField(
            model_name="coursebooking",
            name="payment_amount",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="coursebooking",
            name="exchange_rate",
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="paymenthistory",
            name="charged_amount",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="paymenthistory",
            name="currency",
            field=models.CharField(
                choices=[("INR", "Indian Rupee"), ("USD", "US Dollar")],
                default="INR",
                max_length=3,
            ),
        ),
        migrations.AddField(
            model_name="paymenthistory",
            name="exchange_rate",
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="adhocpayment",
            name="international",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="adhocpayment",
            name="payment_currency",
            field=models.CharField(
                choices=[("INR", "Indian Rupee"), ("USD", "US Dollar")],
                default="INR",
                max_length=3,
            ),
        ),
        migrations.AddField(
            model_name="adhocpayment",
            name="payment_amount",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="adhocpayment",
            name="exchange_rate",
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="adhocpaymenthistory",
            name="charged_amount",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="adhocpaymenthistory",
            name="currency",
            field=models.CharField(
                choices=[("INR", "Indian Rupee"), ("USD", "US Dollar")],
                default="INR",
                max_length=3,
            ),
        ),
        migrations.AddField(
            model_name="adhocpaymenthistory",
            name="exchange_rate",
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True),
        ),
        migrations.RunPython(seed_payment_snapshots, migrations.RunPython.noop),
    ]
