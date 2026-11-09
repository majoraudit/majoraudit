from django.db import migrations


def fix_general_degree_program_id(apps, schema_editor):
    WorksheetMajor = apps.get_model("worksheets", "WorksheetMajor")
    WorksheetMajor.objects.filter(
        major_id="general_degree",
        program_id="default",
    ).update(program_id="general_degree")


def reverse_fix(apps, schema_editor):
    WorksheetMajor = apps.get_model("worksheets", "WorksheetMajor")
    WorksheetMajor.objects.filter(
        major_id="general_degree",
        program_id="general_degree",
    ).update(program_id="default")


class Migration(migrations.Migration):
    dependencies = [
        ("worksheets", "0006_mql_audit_contracts"),
    ]

    operations = [
        migrations.RunPython(fix_general_degree_program_id, reverse_fix),
    ]
