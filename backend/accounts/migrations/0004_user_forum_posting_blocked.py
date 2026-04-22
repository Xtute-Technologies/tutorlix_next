from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_rename_allow_manual_override_user_allow_manual_price'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='forum_posting_blocked',
            field=models.BooleanField(default=False, help_text='Prevents the user from creating or editing forum posts.'),
        ),
    ]
