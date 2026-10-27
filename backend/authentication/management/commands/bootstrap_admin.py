from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or promote a Yale NetID user to Django administrator."

    def add_arguments(self, parser):
        parser.add_argument("netid", help="The user's Yale NetID")

    def handle(self, *args, netid, **options):
        netid = netid.strip()
        if not netid:
            raise CommandError("NetID cannot be empty")

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(username=netid)
        changed = created or not user.is_staff or not user.is_superuser

        if changed:
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=["is_staff", "is_superuser"])

        action = "Created" if created else "Updated" if changed else "Verified"
        self.stdout.write(self.style.SUCCESS(f"{action} admin user: {netid}"))
