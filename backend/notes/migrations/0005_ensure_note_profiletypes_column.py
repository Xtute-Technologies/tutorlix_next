# Generated manually to repair databases missing the profileTypes column.

from django.db import migrations


def ensure_profiletypes_column(apps, schema_editor):
    Note = apps.get_model("notes", "Note")
    table_name = Note._meta.db_table
    field = Note._meta.get_field("profileTypes")

    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }

    if field.column not in columns:
        schema_editor.add_field(Note, field)


class Migration(migrations.Migration):

    dependencies = [
        ("notes", "0004_merge_20260418_2104"),
    ]

    operations = [
        migrations.RunPython(ensure_profiletypes_column, migrations.RunPython.noop),
    ]
