from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.


class CustomUser(AbstractUser):
    class_year = models.PositiveSmallIntegerField(null=True, blank=True)
    intended_language_code = models.CharField(max_length=10, blank=True, default="")
    language_requirement = models.CharField(max_length=10, blank=True, default="")
