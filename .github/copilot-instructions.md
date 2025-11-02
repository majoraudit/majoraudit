This repository combines a Django REST backend and a Vite + React (TypeScript) frontend.

Quick context
- Backend: Django (see `backend/`), runs on https://localhost:8000 in dev using `django-sslserver-v2`.
- Frontend: Vite + React + TypeScript (see `frontend/`), runs on https://localhost:5173 in dev.
- Dev flow expects two shells: one for backend, one for frontend. See `DOC.md` for commands.

What to do first (developer tasks an AI will be asked to help with)
- Start backend dev: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python manage.py migrate && python manage.py runsslserver`
- Start frontend dev: `cd frontend && npm i && npm run dev`

API, auth and CORS expectations
- Frontend proxies `/api/*` to the backend using `vite.config.ts` proxy to `https://localhost:8000`.
- API client: `frontend/src/utils/apiClient.ts` prefixes requests with `/api` and uses `credentials: 'include'` for session cookies.
- Auth flow: CAS-backed login lives at `/api/auth/login/` and logout at `/api/auth/logout/` (see `backend/authentication/urls.py`).
- Profile endpoint used by the frontend: GET `/api/auth/profile/` -> `backend/authentication/views.py:ProfileView`.

Important code patterns and conventions
- Backend apps live under `backend/` top-level apps: `authentication`, `worksheets`, `majors`, `courses`.
- Database: default is SQLite (`backend/settings.py`) for local dev; migrations are present under each app's `migrations/`.
- Frontend environment: `VITE_BACKEND_API_URL` controls absolute backend URLs in some contexts; most client code uses the proxy and `apiClient`.
- HTTP: prefer using `apiClient` (`frontend/src/utils/apiClient.ts`) for JSON endpoints; note it returns raw `Response` objects — callers must call `.json()` and check `response.ok`.
- Auth storage: frontend stores user JSON in `localStorage` under key `user` (`frontend/src/contexts/AuthContext.tsx`).

Files to inspect when changing auth or API behavior
- `backend/authentication/*` (models, views, urls)
- `backend/backend/settings.py` (CORS, CSRF, CAS, SESSION settings)
- `frontend/src/utils/apiClient.ts` and `frontend/src/contexts/AuthContext.tsx`
- `frontend/vite.config.ts` (proxy + basic-ssl plugin)

Build and test hints
- Frontend build: `cd frontend && npm run build` (runs `tsc -b && vite build`).
- Lint frontend with `npm run lint` from `frontend/`.
- Backend has no test runner configured in README, but Django tests live under each app's `tests.py` (run with `python manage.py test`).

Integration notes and pitfalls an AI should warn about
- Cookies and HTTPS: local dev uses TLS (sslserver + vite basic-ssl) and cookies set with `Secure`/`SameSite=None` — ensure requests use `https://` and include credentials.
- Environment variables: `.env` is expected for secret keys and service URLs (see `DOC.md` and `backend/settings.py`).
- Proxy vs absolute URL: frontend code sometimes uses `import.meta.env.VITE_BACKEND_API_URL` (`frontend/src/constants.ts`) and sometimes relies on the `/api` proxy; when generating code, prefer the proxy unless the context explicitly requires absolute URLs.

Examples to follow
- Auth check flow: `frontend/src/contexts/AuthContext.tsx` — calls `apiClient.get('/auth/profile/')`, checks `response.ok`, stores `localStorage.user`, and redirects to `/dashboard` on success.
- API client usage: `apiClient.get('/majors/...')` or `apiClient.post('/worksheets/', data)`; remember to handle `response.ok` and parse JSON.

When editing files, prefer minimal, scoped changes
- Add unit tests in the same app (Django `tests.py`) or component test for frontend under `src/` if adding new behavior.
- Update `DOC.md` if developer commands change.

If you need more context
- Read `DOC.md` for runnable dev commands and common environment vars.
- Run `git grep <symbol>` to find usages of endpoints or components; inspect `migrations/` when changing models.

Ask the user if any of this is out-of-date: port numbers, CAS settings, or environment variables may have changed since this doc was written.
