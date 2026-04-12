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
    A major (with specialization) selected for a specific worksheet.

    `major_id` is a string matching the folder name under
    `backend/major_templates/` (e.g. "computer_science"). `specialization`
    is the slug used to identify a specific MQL file under that folder
    (e.g. "computer_science_ba", "computer_science_bs"). Together they
    identify a single .mql file.
    """
    worksheet = models.ForeignKey(
        UserWorksheet,
        on_delete=models.CASCADE,
        related_name='worksheet_majors',
    )
    major_id = models.CharField(max_length=100)
    specialization = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        unique_together = [('worksheet', 'major_id', 'specialization')]

    def __str__(self):
        return f"{self.major_id}/{self.specialization} (ws={self.worksheet_id})"
