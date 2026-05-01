from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0044_testanswer_question_scoped_upload'),
    ]

    operations = [
        migrations.CreateModel(
            name='MicrosoftCourse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uid', models.CharField(blank=True, db_index=True, max_length=512)),
                ('source_key', models.TextField(blank=True)),
                ('source_key_hash', models.CharField(max_length=64, unique=True)),
                ('slug', models.TextField(blank=True)),
                ('title', models.CharField(max_length=500)),
                ('summary', models.TextField(blank=True)),
                ('subtitle', models.TextField(blank=True)),
                ('url', models.URLField(blank=True, max_length=1000)),
                ('icon_url', models.URLField(blank=True, max_length=1000)),
                ('social_image_url', models.URLField(blank=True, max_length=1000)),
                ('duration_in_minutes', models.PositiveIntegerField(default=0)),
                ('levels', models.JSONField(blank=True, default=list)),
                ('roles', models.JSONField(blank=True, default=list)),
                ('products', models.JSONField(blank=True, default=list)),
                ('subjects', models.JSONField(blank=True, default=list)),
                ('learning_objectives', models.JSONField(blank=True, default=list)),
                ('prerequisites', models.JSONField(blank=True, default=list)),
                ('last_modified', models.DateTimeField(blank=True, null=True)),
                ('course_type', models.CharField(db_index=True, max_length=40)),
                ('type_label', models.CharField(blank=True, max_length=120)),
                ('popularity', models.FloatField(default=0)),
                ('locale', models.CharField(db_index=True, default='en-us', max_length=20)),
                ('source_url', models.URLField(blank=True, max_length=1000)),
                ('scraped', models.BooleanField(default=False)),
                ('scraped_duration_label', models.CharField(blank=True, max_length=120)),
                ('raw_payload', models.JSONField(blank=True, default=dict)),
                ('is_active', models.BooleanField(default=True)),
                ('synced_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Microsoft Course',
                'verbose_name_plural': 'Microsoft Courses',
                'ordering': ['-popularity', '-last_modified', 'title'],
                'indexes': [
                    models.Index(fields=['locale', 'course_type'], name='lms_ms_course_locale_type_idx'),
                    models.Index(fields=['is_active', 'synced_at'], name='lms_ms_course_active_sync_idx'),
                    models.Index(fields=['popularity', 'last_modified'], name='lms_ms_course_rank_idx'),
                ],
            },
        ),
    ]
