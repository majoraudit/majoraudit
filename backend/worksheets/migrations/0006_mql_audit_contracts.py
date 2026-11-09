from django.db import migrations, models
import django.db.models.deletion


def forward_program_ids(apps, schema_editor):
    WorksheetMajor = apps.get_model("worksheets", "WorksheetMajor")
    for selected in WorksheetMajor.objects.all():
        stem = selected.specialization or ""
        prefix = f"{selected.major_id}_"
        selected.program_id = stem[len(prefix):] if stem.startswith(prefix) else stem
        if not selected.program_id:
            selected.program_id = "default"
        selected.save(update_fields=["program_id"])


class Migration(migrations.Migration):
    dependencies = [("worksheets", "0005_worksheetmajor")]
    operations = [
        migrations.AddField(model_name="userworksheetclass", name="grade", field=models.CharField(blank=True, max_length=8, null=True)),
        migrations.AddField(model_name="userworksheetclass", name="grading_mode", field=models.CharField(blank=True, default="letter", max_length=24)),
        migrations.AddField(model_name="userworksheetclass", name="graduate_grade", field=models.CharField(blank=True, max_length=24, null=True)),
        migrations.AddField(model_name="userworksheetclass", name="source", field=models.CharField(default="yale", max_length=24)),
        migrations.AddField(model_name="userworksheetclass", name="enrolled_course_code", field=models.CharField(blank=True, default="", max_length=24)),
        migrations.AddField(model_name="userworksheetclass", name="year_of_study_override", field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name="worksheetmajor", name="catalog_year", field=models.CharField(default="2026-2027", max_length=20)),
        migrations.AddField(model_name="worksheetmajor", name="declared_choices", field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name="worksheetmajor", name="fact_ids", field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name="worksheetmajor", name="program_id", field=models.CharField(blank=True, max_length=100)),
        migrations.RunPython(forward_program_ids, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(name="worksheetmajor", unique_together=set()),
        migrations.RemoveField(model_name="worksheetmajor", name="specialization"),
        migrations.AlterField(model_name="worksheetmajor", name="program_id", field=models.CharField(max_length=100)),
        migrations.AlterUniqueTogether(name="worksheetmajor", unique_together={("worksheet", "catalog_year", "major_id", "program_id")}),
        migrations.CreateModel(
            name="WorksheetMajorAttemptApproval",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("approved_for", models.JSONField(blank=True, default=list)),
                ("worksheet_class", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="worksheets.userworksheetclass")),
                ("worksheet_major", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attempt_approvals", to="worksheets.worksheetmajor")),
            ],
            options={"unique_together": {("worksheet_major", "worksheet_class")}},
        ),
    ]
