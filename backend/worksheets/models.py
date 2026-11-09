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
    grade = models.CharField(max_length=8, null=True, blank=True)
    grading_mode = models.CharField(max_length=24, blank=True, default="letter")
    graduate_grade = models.CharField(max_length=24, null=True, blank=True)
    source = models.CharField(max_length=24, default="yale")
    enrolled_course_code = models.CharField(max_length=24, blank=True, default="")
    year_of_study_override = models.PositiveSmallIntegerField(null=True, blank=True)

    def clean(self):
        if bool(self.course) == bool(self.course_instance):
            raise ValidationError(
                "Provide either 'course' or 'course_instance', not both."
            )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
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

    A catalog-backed program selected for a worksheet.
    """
    worksheet = models.ForeignKey(
        UserWorksheet,
        on_delete=models.CASCADE,
        related_name='worksheet_majors',
    )
    major_id = models.CharField(max_length=100)
    catalog_year = models.CharField(max_length=20, default="2026-2027")
    program_id = models.CharField(max_length=100)
    declared_choices = models.JSONField(default=dict, blank=True)
    fact_ids = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = [('worksheet', 'catalog_year', 'major_id', 'program_id')]

    def __str__(self):
        return f"{self.catalog_year}/{self.major_id}/{self.program_id} (ws={self.worksheet_id})"


class WorksheetMajorAttemptApproval(models.Model):
    worksheet_major = models.ForeignKey(
        WorksheetMajor, on_delete=models.CASCADE, related_name="attempt_approvals"
    )
    worksheet_class = models.ForeignKey(UserWorksheetClass, on_delete=models.CASCADE)
    approved_for = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = [('worksheet_major', 'worksheet_class')]
