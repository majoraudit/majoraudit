#!/bin/sh
set -eu

repository_url="${MAJORS_REPOSITORY_URL:-https://github.com/majoraudit/majors.git}"
MAJORS_COMMIT="$(git ls-remote "$repository_url" HEAD | awk '{print $1}')"
test -n "$MAJORS_COMMIT"
export MAJORS_COMMIT
exec docker compose build "$@"
