import logging

import requests
from django.conf import settings
from django.dispatch import receiver
from django_cas_ng.signals import cas_user_authenticated


logger = logging.getLogger(__name__)


@receiver(cas_user_authenticated)
def update_user_from_yalies(sender, **kwargs):
    user = kwargs['user']

    if not settings.YALIES_URL or not settings.YALIES_API_KEY:
        logger.info("Skipping Yalies enrichment because it is not configured")
        return

    try:
        headers = {"Authorization": f"Bearer {settings.YALIES_API_KEY}"}
        body = {"query": user.username}
        request = requests.post(
            f"{settings.YALIES_URL}people", headers=headers, json=body, timeout=10)

        request.raise_for_status()
        data = request.json()

        if not isinstance(data, list) or not data or not isinstance(data[0], dict):
            logger.warning("Yalies returned no profile for NetID %s", user.username)
            return

        profile = data[0]
        user.first_name = profile.get('first_name') or ''
        user.last_name = profile.get('last_name') or ''
        user.email = profile.get('email') or ''
        user.save(update_fields=['first_name', 'last_name', 'email'])

    except (requests.RequestException, ValueError, TypeError) as error:
        # Profile enrichment must never prevent an otherwise valid CAS login.
        logger.warning("Failed to enrich NetID %s from Yalies: %s", user.username, error)
