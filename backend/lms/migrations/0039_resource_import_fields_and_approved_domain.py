from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('lms', '0038_resource'),
    ]

    operations = [
        migrations.AddField(
            model_name='resource',
            name='imported_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='resource',
            name='source_url',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='ApprovedResourceDomain',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('domain', models.CharField(max_length=255, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Approved Resource Domain',
                'verbose_name_plural': 'Approved Resource Domains',
                'ordering': ['domain'],
            },
        ),
    ]
