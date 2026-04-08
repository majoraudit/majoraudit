from django.db import models
from authentication.models import CustomUser


class UserInfo(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='info')
    class_year = models.PositiveIntegerField(null=True, blank=True)
    language_requirement = models.CharField(max_length=10, blank=True, default="")
    intended_major_id = models.CharField(max_length=100, blank=True, default="")
    intended_language_code = models.CharField(max_length=10, blank=True, default="")

    def __str__(self):
        return f"{self.user} - {self.class_year}"


class UserMajor(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='declared_majors')
    major_id = models.CharField(max_length=100)
    specialization = models.CharField(max_length=100, blank=True, default="")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'major_id']

    def __str__(self):
        return f"{self.user} - {self.major_id}"