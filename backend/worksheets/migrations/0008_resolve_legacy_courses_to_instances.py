from django.db import migrations


def resolve_legacy_courses(apps, schema_editor):
    WorksheetClass = apps.get_model("worksheets", "UserWorksheetClass")
    CourseInstance = apps.get_model("courses", "CourseInstance")

    legacy_classes = WorksheetClass.objects.filter(
        course_id__isnull=False,
        course_instance_id__isnull=True,
    ).select_related("worksheet_semester")

    for worksheet_class in legacy_classes.iterator():
        semester = worksheet_class.worksheet_semester
        instance = CourseInstance.objects.filter(
            course_id=worksheet_class.course_id,
            year=semester.year,
            season=semester.season,
        ).order_by("section_num", "external_id").first()
        if instance is not None:
            worksheet_class.course_id = None
            worksheet_class.course_instance_id = instance.pk
            worksheet_class.save(update_fields=["course", "course_instance"])


class Migration(migrations.Migration):
    dependencies = [
        ("worksheets", "0007_fix_general_degree_program_id"),
    ]

    operations = [
        migrations.RunPython(resolve_legacy_courses, migrations.RunPython.noop),
    ]
