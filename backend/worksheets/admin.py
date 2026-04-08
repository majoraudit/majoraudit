from django.contrib import admin
from .models import UserWorksheet, UserWorksheetClass, UserWorksheetSemester, WorksheetMajor

# Register your models here.
admin.site.register(UserWorksheet)
admin.site.register(UserWorksheetClass)
admin.site.register(UserWorksheetSemester)
admin.site.register(WorksheetMajor)
