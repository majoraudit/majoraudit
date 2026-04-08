from django.db import models
from django.core.exceptions import ValidationError
from authentication.models import CustomUser
from courses.models import Course, CourseInstance, Seasons

# Create your models here.


class UserWorksheet(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=32)


class UserWorksheetSemester(models.Model):
    worksheet = models.ForeignKey(UserWorksheet, on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    season = models.CharField(choices=Seasons.choices, max_length=10)
    title = models.CharField(max_length=32, blank=True, default="")
    is_completed = models.BooleanField(default=False)


class UserWorksheetClass(models.Model):
    worksheet_semester = models.ForeignKey(
        UserWorksheetSemester, on_delete=models.CASCADE)
    course = models.ForeignKey(
        Course, null=True, blank=True, on_delete=models.CASCADE)
    course_instance = models.ForeignKey(
        CourseInstance, null=True, blank=True, on_delete=models.CASCADE)
    creditdf = models.BooleanField(default=False)

    def clean(self):
        if bool(self.course) == bool(self.course_instance):
            raise ValidationError(
                "Provide either 'course' or 'course_instance', not both."
            )

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(course__isnull=False, course_instance__isnull=True) |
                    models.Q(course__isnull=True,
                             course_instance__isnull=False)
                ),
                name="usercourse_exactly_one_fk"
            )
        ]


class WorksheetMajor(models.Model):
    """
    A major (with degree type) selected for a specific worksheet.

    `major_id` is a string matching the folder name under
    `backend/major_templates/` (e.g. "computer_science"). `degree_type` is
    the suffix used in MQL filenames (e.g. "ba", "bs", "bs_ms"). Together
    they identify a single `<major_id>_<degree_type>.mql` file.
    """
    worksheet = models.ForeignKey(
        UserWorksheet,
        on_delete=models.CASCADE,
        related_name='worksheet_majors',
    )
    major_id = models.CharField(max_length=100)
    degree_type = models.CharField(max_length=20)

    class Meta:
        unique_together = [('worksheet', 'major_id', 'degree_type')]

    def __str__(self):
        return f"{self.major_id}_{self.degree_type} (ws={self.worksheet_id})"
