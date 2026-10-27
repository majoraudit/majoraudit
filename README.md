# Major Audit

## Develop with Docker Compose

The only prerequisites are Docker with Docker Compose and a root-level `.env`
file.

```sh
cp .env.example .env
# Replace DJANGO_SECRET_KEY, set DJANGO_ADMIN_NETID to your Yale NetID, and
# configure any external API credentials in .env.
docker compose up --build
```

This is the default development environment. Vite and Django run inside Docker
with the repository source mounted into their containers. After the first
build, edit files normally: frontend changes use Vite hot module replacement
and backend changes trigger Django's automatic reload. You do not need to
restart Compose after each source change.

Rebuild when `package.json`, `package-lock.json`, `requirements.txt`, a
Dockerfile, or Compose configuration changes:

```sh
docker compose up --build
```

Open <https://localhost:5173>. The frontend uses HTTPS because Yale NetID/CAS
authentication requires a secure redirect target. The container creates a
self-signed localhost certificate automatically; accept the browser's
certificate warning before attempting to sign in.

Set `APP_PORT` and the matching port in
`FRONTEND_URL` if you want to use another host port.

During startup, the backend automatically applies database migrations, collects
Django admin static files, and creates/promotes `DJANGO_ADMIN_NETID` when it is
set. The admin user still authenticates through Yale CAS; no password is stored
in `.env`. Visit <https://localhost:5173/admin/> to access Django admin.

The database is stored in the named `backend-data` volume, so it survives
container recreation.

Course catalog data is fetched separately because the semester must be chosen.
The import is safe to rerun for the same semester:

```sh
docker compose exec backend python manage.py fetch_courses 202603
```

Replace `202603` with the desired Yale semester code.

Useful commands:

```sh
docker compose down                 # stop the application
docker compose logs -f              # follow logs
docker compose exec backend python manage.py bootstrap_admin YOUR_NETID
```

To remove the persisted development database too, run `docker compose down -v`.

## Production-like integration test

The production stack contains no source mounts. It builds the frontend into an
Nginx image and serves Django with Gunicorn:

```sh
docker compose -f compose.prod.yaml up --build
```

Stop it with:

```sh
docker compose -f compose.prod.yaml down
```
