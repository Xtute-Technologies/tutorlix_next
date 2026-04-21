# Generated manually for forum functionality.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0031_profiletype_home_content'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ForumPost',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(blank=True, max_length=180)),
                ('content', models.TextField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='forum_posts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['is_active', 'created_at'], name='lms_forumpo_is_acti_8f6c88_idx'),
                    models.Index(fields=['author', 'created_at'], name='lms_forumpo_author__c44085_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='ForumComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='forum_comments', to=settings.AUTH_USER_MODEL)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='lms.forumpost')),
            ],
            options={
                'ordering': ['created_at'],
                'indexes': [
                    models.Index(fields=['post', 'created_at'], name='lms_forumco_post_id_342a08_idx'),
                    models.Index(fields=['author', 'created_at'], name='lms_forumco_author__972e07_idx'),
                    models.Index(fields=['is_active', 'created_at'], name='lms_forumco_is_acti_131cd0_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='ForumPostLike',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes', to='lms.forumpost')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='forum_post_likes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['post', 'created_at'], name='lms_forumpo_post_id_eec2fd_idx'),
                    models.Index(fields=['user', 'created_at'], name='lms_forumpo_user_id_477063_idx'),
                ],
                'unique_together': {('post', 'user')},
            },
        ),
    ]
