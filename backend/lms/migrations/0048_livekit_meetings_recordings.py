from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0047_international_payments'),
    ]

    operations = [
        migrations.AlterField(
            model_name='coursespecificclass',
            name='link',
            field=models.URLField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='studentspecificclass',
            name='class_link',
            field=models.URLField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='recording',
            name='recording_link',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='recording',
            name='recording_status',
            field=models.CharField(choices=[('ready', 'Ready'), ('recording', 'Recording'), ('processing', 'Processing'), ('failed', 'Failed')], default='ready', max_length=20),
        ),
    ]
