import requests
from django.core.management.base import BaseCommand
from django.db import transaction
from courses.models import Course, CourseCode, CourseProfessor, CourseInstance, CourseDistribution, CourseTag, Seasons

API_URL = "https://api.coursetable.com/api/catalog/public/"


def infer_format(item, flags):
    text = " ".join(str(item.get(key) or "") for key in ("title", "description", "classnotes", "regnotes")).lower()
    flag_text = " ".join(flags).lower()
    if "senior project" in text or "senior project" in flag_text:
        return "senior_project"
    if "independent study" in text or "directed study" in text:
        return "independent_study"
    if "research" in str(item.get("title") or "").lower():
        return "research"
    if "studio" in text or "studio" in flag_text:
        return "studio"
    if "laboratory" in text or " lab" in flag_text:
        return "lab"
    if item.get("colsem") or item.get("fysem") or item.get("sysem") or "seminar" in flag_text:
        return "seminar"
    if "tutorial" in text:
        return "tutorial"
    if "colloquium" in text:
        return "colloquium"
    return "lecture"


def infer_language(flags):
    marker = " Taught in "
    return next((flag.rsplit(marker, 1)[1] for flag in flags if marker in flag), "English")

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "semester",
            type=str,
            help="Semester code, e.g. 202503",
        )

    @transaction.atomic
    def handle(self, *args, semester, **options):
        url = f"{API_URL}{semester}"
        self.stdout.write(f"Requesting {url} …")
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"HTTP error: {exc}"))
            return

        payload = resp.json()
        for item in payload:
            flag_texts = [entry["flag"]["flag_text"] for entry in item.get("course_flags", [])]
            course, _ = Course.objects.update_or_create(
                external_id=item["same_course_id"],
                defaults={
                    "title": item["title"],
                    "description": item["description"],
                    "credits": item["credits"],
                    "format": infer_format(item, flag_texts),
                    "language": infer_language(flag_texts),
                },
            )

            codes = [c.upper() for c in item["skills"]]
            dists = CourseDistribution.objects.filter(code__in=codes)
            course.distributionals.set(dists)
    
            course_tags = []
            for flag_text in flag_texts:
                tag, _ = CourseTag.objects.get_or_create(name=flag_text)
                course_tags.append(tag)
            course.course_tags.set(course_tags)

            listings = item["listings"]
            course_codes = []
            for listing in listings:
                course_code, _ = CourseCode.objects.update_or_create(
                    department=listing["subject"],
                    number=listing["number"]
                )
                course_codes.append(course_code)

            professors = item["course_professors"]
            course_professors = []
            for professor in professors:
                course_professor, _ = CourseProfessor.objects.update_or_create(
                    external_id=professor["professor"]["professor_id"],
                    defaults={
                        "name": professor["professor"]["name"]
                    }
                )
                course_professors.append(course_professor)

            parsed_year = item["season_code"][:4]
            season_number = item["season_code"][-2:]
            if season_number == "01":
                parsed_season = Seasons.SP
            elif season_number == "02":
                parsed_season = Seasons.SU
            else:
                parsed_season = Seasons.FA

            course_instance, _ = CourseInstance.objects.update_or_create(
                external_id=item["course_id"],
                defaults={
                    "course": course,
                    "year": parsed_year,
                    "season": parsed_season,
                    "section_num": item["section"],
                },
            )
            course_instance.course_codes.set(course_codes)
            course_instance.course_professors.set(course_professors)

        self.stdout.write(self.style.SUCCESS("Success!"))
