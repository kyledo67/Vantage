from django.db import migrations


def enable_row_level_security(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY")


def disable_row_level_security(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY")


class Migration(migrations.Migration):
    dependencies = [
        ("market_data", "0002_userprofile_persona_event_created_at"),
    ]

    operations = [
        migrations.RunPython(
            enable_row_level_security,
            reverse_code=disable_row_level_security,
        ),
    ]
