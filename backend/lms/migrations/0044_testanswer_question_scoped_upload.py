from django.db import migrations, models
import lms.models


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0043_alter_resource_file'),
    ]

    operations = [
        migrations.AlterField(
            model_name='testanswer',
            name='uploaded_file',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=lms.models.test_answer_upload_path,
            ),
        ),
    ]
