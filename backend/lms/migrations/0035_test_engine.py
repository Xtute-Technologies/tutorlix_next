from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0034_forum_notifications'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Test',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('instructions', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')], default='draft', max_length=20)),
                ('duration_minutes', models.PositiveIntegerField(default=60)),
                ('lock_on_window_blur', models.BooleanField(default=True)),
                ('available_from', models.DateTimeField(blank=True, null=True)),
                ('available_until', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tests_created', to=settings.AUTH_USER_MODEL)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tests', to='lms.product')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='TestQuestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(default=1)),
                ('title', models.CharField(blank=True, max_length=255, null=True)),
                ('prompt', models.TextField()),
                ('question_type', models.CharField(choices=[('multiple_choice', 'Multiple Choice'), ('subjective', 'Subjective'), ('file_upload', 'File Upload'), ('coding', 'Coding')], max_length=30)),
                ('marks', models.DecimalField(decimal_places=2, default=1, max_digits=6, validators=[django.core.validators.MinValueValidator(0)])),
                ('is_required', models.BooleanField(default=True)),
                ('options', models.JSONField(blank=True, default=list)),
                ('correct_options', models.JSONField(blank=True, default=list)),
                ('attachment', models.FileField(blank=True, null=True, upload_to='tests/questions/')),
                ('allowed_file_types', models.CharField(blank=True, max_length=255, null=True)),
                ('starter_code', models.TextField(blank=True, null=True)),
                ('coding_language', models.CharField(blank=True, max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('test', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='lms.test')),
            ],
            options={'ordering': ['order', 'id']},
        ),
        migrations.CreateModel(
            name='TestAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('not_started', 'Not Started'), ('in_progress', 'In Progress'), ('locked', 'Locked'), ('submitted', 'Submitted')], default='not_started', max_length=20)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('last_resumed_at', models.DateTimeField(blank=True, null=True)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('last_activity_at', models.DateTimeField(blank=True, null=True)),
                ('locked_at', models.DateTimeField(blank=True, null=True)),
                ('unlocked_at', models.DateTimeField(blank=True, null=True)),
                ('locked_reason', models.TextField(blank=True, null=True)),
                ('window_violation_count', models.PositiveIntegerField(default=0)),
                ('current_question_index', models.PositiveIntegerField(default=0)),
                ('time_spent_seconds', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('student', models.ForeignKey(limit_choices_to={'role': 'student'}, on_delete=django.db.models.deletion.CASCADE, related_name='test_attempts', to=settings.AUTH_USER_MODEL)),
                ('test', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attempts', to='lms.test')),
                ('unlocked_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='test_attempts_unlocked', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at'], 'unique_together': {('test', 'student')}},
        ),
        migrations.CreateModel(
            name='TestAnswer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('selected_options', models.JSONField(blank=True, default=list)),
                ('subjective_answer', models.TextField(blank=True, null=True)),
                ('code_answer', models.TextField(blank=True, null=True)),
                ('code_language', models.CharField(blank=True, max_length=50, null=True)),
                ('uploaded_file', models.FileField(blank=True, null=True, upload_to='tests/answers/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('attempt', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='lms.testattempt')),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='lms.testquestion')),
            ],
            options={'ordering': ['question__order', 'id'], 'unique_together': {('attempt', 'question')}},
        ),
    ]
