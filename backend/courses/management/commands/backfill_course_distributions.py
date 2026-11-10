from django.core.management import call_command
from django.core.management.base import BaseCommand

from courses.models import CourseInstance


SEASON_SUFFIXES = {"SP": "01", "SU": "02", "FA": "03"}


class Command(BaseCommand):
    help = "Re-import every semester already present in the database to repair distribution codes."

    def handle(self, *args, **options):
        semesters = sorted({
            f"{year}{SEASON_SUFFIXES[season]}"
            for year, season in CourseInstance.objects.values_list("year", "season").distinct()
            if season in SEASON_SUFFIXES
        })
        if not semesters:
            self.stdout.write(self.style.WARNING("No imported semesters to backfill."))
            return

        for semester in semesters:
            self.stdout.write(f"Backfilling {semester} …")
            call_command("fetch_courses", semester)

        self.stdout.write(self.style.SUCCESS(
            f"Re-imported {len(semesters)} semesters with canonical distribution codes."
        ))
