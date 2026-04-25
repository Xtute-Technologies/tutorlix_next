from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0039_resource_import_fields_and_approved_domain'),
    ]

    operations = [
        migrations.CreateModel(
            name='ResourceImportJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source_url', models.URLField()),
                ('subject', models.CharField(max_length=120)),
                ('curriculum', models.CharField(max_length=120)),
                ('grade_or_course', models.CharField(max_length=120)),
                ('topic', models.CharField(max_length=160)),
                ('visibility', models.CharField(choices=[('teacher', 'Teacher Only'), ('admin', 'Admin Only')], default='teacher', max_length=20)),
                ('status', models.CharField(choices=[('queued', 'Queued'), ('running', 'Running'), ('completed', 'Completed'), ('failed', 'Failed')], default='queued', max_length=20)),
                ('progress_current', models.PositiveIntegerField(default=0)),
                ('progress_total', models.PositiveIntegerField(default=0)),
                ('created_resources_count', models.PositiveIntegerField(default=0)),
                ('log_lines', models.JSONField(blank=True, default=list)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='resource_import_jobs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Resource Import Job',
                'verbose_name_plural': 'Resource Import Jobs',
                'ordering': ['-created_at'],
            },
        ),
    ]
