from django.db import models
from authentication.models import CustomUser

# Create your models here.


class Distributionals(models.TextChoices):
    HU = "Hu", "Humanities & Arts"
    SO = "So", "Social Sciences"
    SC = "Sc", "Sciences"
    QR = "QR", "Quantitative Reasoning"
    WR = "WR", "Writing"
    L1 = "L1", "Language Level 1"
    L2 = "L2", "Language Level 2"
    L3 = "L3", "Language Level 3"
    L4 = "L4", "Language Level 4"
    L5 = "L5", "Language Level 5"


class CourseDistribution(models.Model):
    code = models.CharField(
        max_length=2,
        choices=Distributionals.choices,
        primary_key=True
    )

    def __str__(self):
        return self.code


class Seasons(models.TextChoices):
    SP = "SP", "Spring"
    SU = "SU", "Summer"
    FA = "FA", "Fall"


class CourseTag(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


class Course(models.Model):
    external_id = models.PositiveIntegerField(unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    credits = models.DecimalField(decimal_places=1, max_digits=2)
    distributionals = models.ManyToManyField(CourseDistribution, blank=True)
    course_tags = models.ManyToManyField(CourseTag)

    def __str__(self):
        return self.title
    

class CourseCode(models.Model):
    department = models.CharField(max_length=10)
    number = models.CharField(max_length=4)

    def __str__(self):
        return f"{self.department} {self.number}"


class CourseProfessor(models.Model):
    external_id = models.PositiveIntegerField(unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class CourseInstance(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    external_id = models.PositiveIntegerField(unique=True)
    year = models.PositiveIntegerField()
    season = models.CharField(choices=Seasons.choices, max_length=10)
    section_num = models.CharField(max_length=10)
    course_codes = models.ManyToManyField(CourseCode)
    course_professors = models.ManyToManyField(CourseProfessor)

    def __str__(self):
        return f"{self.course.title} {self.season} {self.year}"


class CustomCourse(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField()
    credits = models.DecimalField(decimal_places=1, max_digits=2)
    distributionals = models.ManyToManyField(CourseDistribution, blank=True)
    department = models.CharField(max_length=10)
    number = models.CharField(max_length=4)
    year = models.PositiveIntegerField()
    season = models.CharField(choices=Seasons.choices, max_length=10)
    professor = models.CharField(max_length=50)

    def __str__(self):
        return f"Custom - {self.course.title} {self.department} {self.number} {self.season} {self.year}"
