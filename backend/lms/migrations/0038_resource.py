from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0037_rename_lms_forumco_post_id_342a08_idx_lms_forumco_post_id_81a008_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Resource',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('subject', models.CharField(max_length=120)),
                ('curriculum', models.CharField(max_length=120)),
                ('grade_or_course', models.CharField(max_length=120)),
                ('topic', models.CharField(max_length=160)),
                ('resource_type', models.CharField(choices=[('pdf', 'PDF'), ('worksheet', 'Worksheet'), ('video', 'Video'), ('link', 'Link'), ('notes', 'Notes'), ('question_bank', 'Question Bank'), ('lesson_plan', 'Lesson Plan')], max_length=32)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('external_url', models.URLField(blank=True, null=True)),
                ('file', models.FileField(blank=True, null=True, upload_to='resources/%Y/%m/')),
                ('visibility', models.CharField(choices=[('teacher', 'Teacher Only'), ('admin', 'Admin Only')], default='teacher', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='resources_uploaded', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Resource',
                'verbose_name_plural': 'Resources',
                'ordering': ['-updated_at', '-created_at'],
            },
        ),
    ]
