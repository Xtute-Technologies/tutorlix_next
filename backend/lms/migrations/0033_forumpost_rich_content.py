from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0032_forum_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='forumpost',
            name='rich_content',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
