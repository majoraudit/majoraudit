from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("courses", "0009_rename_course_tag_course_course_tags")]
    operations = [
        migrations.AddField(
            model_name="course", name="format",
            field=models.CharField(default="lecture", max_length=32),
        ),
        migrations.AddField(
            model_name="course", name="language",
            field=models.CharField(blank=True, default="English", max_length=64),
        ),
    ]
