#!/bin/sh
set -eu

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ -n "${DJANGO_ADMIN_NETID:-}" ]; then
    python manage.py bootstrap_admin "$DJANGO_ADMIN_NETID"
fi

exec "$@"
