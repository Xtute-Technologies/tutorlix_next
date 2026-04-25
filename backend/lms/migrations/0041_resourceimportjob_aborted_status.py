from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0040_resourceimportjob'),
    ]

    operations = [
        migrations.AlterField(
            model_name='resourceimportjob',
            name='status',
            field=models.CharField(choices=[('queued', 'Queued'), ('running', 'Running'), ('aborted', 'Aborted'), ('completed', 'Completed'), ('failed', 'Failed')], default='queued', max_length=20),
        ),
    ]
