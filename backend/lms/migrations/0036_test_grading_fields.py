from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0035_test_engine'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='testanswer',
            name='awarded_marks',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6, validators=[django.core.validators.MinValueValidator(0)]),
        ),
        migrations.AddField(
            model_name='testanswer',
            name='review_comment',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='testanswer',
            name='reviewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='testanswer',
            name='reviewed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='graded_test_answers', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='testattempt',
            name='reviewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='testattempt',
            name='total_awarded_marks',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8, validators=[django.core.validators.MinValueValidator(0)]),
        ),
    ]
