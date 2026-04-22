from django.db import migrations, models
from django.conf import settings
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0033_forumpost_rich_content'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ForumNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('new_post', 'New Post'), ('post_like', 'Post Like'), ('post_comment', 'Post Comment'), ('post_share', 'Post Share')], max_length=32)),
                ('message', models.CharField(max_length=255)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='forum_notifications_sent', to=settings.AUTH_USER_MODEL)),
                ('post', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='lms.forumpost')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='forum_notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='forumnotification',
            index=models.Index(fields=['recipient', 'is_read', 'created_at'], name='lms_forumno_recipie_9644ca_idx'),
        ),
        migrations.AddIndex(
            model_name='forumnotification',
            index=models.Index(fields=['recipient', 'created_at'], name='lms_forumno_recipie_5eb5f8_idx'),
        ),
        migrations.AddIndex(
            model_name='forumnotification',
            index=models.Index(fields=['notification_type', 'created_at'], name='lms_forumno_notific_19b4df_idx'),
        ),
    ]
