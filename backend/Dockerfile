# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS module-sources

ARG MAJORS_REPOSITORY_URL=https://github.com/majoraudit/majors.git
ARG MAJORS_COMMIT=main
ARG MQL_AUDIT_REPOSITORY_URL=https://github.com/majoraudit/mql-audit.git
ARG MQL_AUDIT_COMMIT=f77ab02faf8fc9dd39a56097731c77349ab6c9fc
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN test -n "$MAJORS_COMMIT" \
    && test -n "$MQL_AUDIT_COMMIT" \
    && git init /src/majors \
    && git -C /src/majors remote add origin "$MAJORS_REPOSITORY_URL" \
    && git -C /src/majors fetch --depth 1 origin "$MAJORS_COMMIT" \
    && git -C /src/majors checkout --detach FETCH_HEAD \
    && git init /src/mql-audit \
    && git -C /src/mql-audit remote add origin "$MQL_AUDIT_REPOSITORY_URL" \
    && git -C /src/mql-audit fetch --depth 1 origin "$MQL_AUDIT_COMMIT" \
    && git -C /src/mql-audit checkout --detach FETCH_HEAD \
    && mkdir -p /snapshot \
    && cp -R /src/majors/majors /snapshot/majors \
    && git -C /src/majors rev-parse HEAD > /snapshot/majors/REVISION

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=5

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=module-sources /src/mql-audit /tmp/mql-audit
RUN pip install --no-cache-dir /tmp/mql-audit && rm -rf /tmp/mql-audit
COPY --from=module-sources /snapshot/majors /opt/majoraudit/majors
COPY --from=module-sources /src/majors/validate.py /opt/majoraudit/validate.py
RUN python /opt/majoraudit/validate.py

COPY . .
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]

FROM base AS development
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

FROM base AS production
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "-"]
