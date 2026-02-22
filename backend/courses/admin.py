from django.contrib import admin
from .models import Course, CourseTag, CourseInstance, CourseCode, CourseProfessor

# Register your models here.
admin.site.register(Course)
admin.site.register(CourseTag)
admin.site.register(CourseInstance)
admin.site.register(CourseCode)
admin.site.register(CourseProfessor)
