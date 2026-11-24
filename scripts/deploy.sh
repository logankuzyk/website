#!/usr/bin/env bash
# Runs ON THE VPS (streamed over SSH by .github/workflows/deploy.yml).
# Usage: bash -s -- <repo-dir> <git-sha>
#
# Updates the checkout to <git-sha>, rebuilds the `website` service, waits for it to answer,
# and rolls back to the previously deployed commit if the new one doesn't come up.
set -euo pipefail

REPO_DIR="${1:?repo dir required}"
SHA="${2:?git sha required}"
SERVICE=website
HEALTH_TIMEOUT=90

cd "$REPO_DIR"

# One deploy at a time, even if two are triggered close together.
exec 9>.deploy.lock
flock -w 600 9

healthy() {
  # Port 3000 isn't published, so probe from inside the container. Any non-5xx answer counts
  # (the app may 301 to the canonical host, see redirects.js).
  docker compose exec -T "$SERVICE" node -e \
    "fetch('http://127.0.0.1:3000/',{redirect:'manual'}).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1
}

wait_healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  while ((SECONDS < deadline)); do
    healthy && return 0
    sleep 3
  done
  return 1
}

deploy() {
  git reset --hard "$1"
  # Compose builds first and only swaps the container once the image is ready,
  # so a failed build leaves the old version running. mongo is untouched unless its config changed.
  docker compose up -d --build "$SERVICE"
}

PREVIOUS="$(git rev-parse HEAD)"

if [[ "$PREVIOUS" == "$SHA" ]] && healthy; then
  echo "Already at $SHA and healthy; nothing to do."
  exit 0
fi

echo "Deploying $SHA (previous: $PREVIOUS)"
git fetch --prune origin main
git cat-file -e "$SHA^{commit}" # fail early if the commit isn't on the VPS's fetch

if deploy "$SHA" && wait_healthy; then
  echo "Deployed $SHA"
  docker image prune -f >/dev/null
  exit 0
fi

echo "::error::Deploy of $SHA failed; rolling back to $PREVIOUS" >&2
docker compose logs --tail=60 "$SERVICE" >&2 || true
deploy "$PREVIOUS"
if wait_healthy; then
  echo "Rolled back to $PREVIOUS" >&2
else
  echo "::error::Rollback to $PREVIOUS is not healthy either; manual intervention needed" >&2
fi
exit 1
