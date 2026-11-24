#!/usr/bin/env bash
# Runs ON THE VPS (streamed over SSH by .github/workflows/deploy.yml).
# Usage: bash -s -- <repo-dir> <git-sha>
#
# Updates the checkout to <git-sha>, rebuilds the `website` service, waits for it to answer,
# and rolls back to the last known-good commit if the new one doesn't come up.
#
# The script arrives on bash's stdin, so everything lives inside main() (bash must parse the whole
# function before running any of it) and every docker call gets </dev/null. Otherwise a command that
# reads stdin could swallow the unread rest of the script, including the rollback.
set -euo pipefail

main() {
  local repo_dir="${1:?repo dir required}"
  local sha="${2:?git sha required}"
  local service=website
  local health_timeout=90
  local health_streak=3 # consecutive successful probes required, so a crash loop that answers once doesn't pass

  cd "$repo_dir"

  # One deploy at a time, even if two are triggered close together.
  exec 9>.deploy.lock
  flock -w 600 9

  # Commit last seen healthy. Written only after a healthy deploy, so rollback never lands on a bad commit.
  local good_file
  good_file="$(git rev-parse --git-dir)/deploy-last-good"

  healthy() {
    # Port 3000 isn't published, so probe from inside the container. Any non-5xx answer counts
    # (the app may 301 to the canonical host, see redirects.js).
    docker compose exec -T "$service" node -e \
      "fetch('http://127.0.0.1:3000/',{redirect:'manual'}).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))" \
      </dev/null >/dev/null 2>&1
  }

  wait_healthy() {
    local deadline=$((SECONDS + health_timeout))
    local streak=0
    while ((SECONDS < deadline)); do
      if healthy; then
        streak=$((streak + 1))
        if ((streak >= health_streak)); then return 0; fi
        sleep 2
      else
        streak=0
        sleep 3
      fi
    done
    return 1
  }

  deploy() {
    # Called from an `if`, where `set -e` is off, so every step must be checked explicitly.
    git reset --hard "$1" >/dev/null || return 1
    [[ "$(git rev-parse HEAD)" == "$1" ]] || return 1
    # Compose builds first and only swaps the container once the image is ready,
    # so a failed build leaves the old version running. mongo is untouched unless its config changed.
    docker compose up -d --build "$service" </dev/null || return 1
  }

  local current previous
  current="$(git rev-parse HEAD)"
  # Roll back to the last known-good commit; fall back to HEAD on the very first run.
  previous="$(cat "$good_file" 2>/dev/null || true)"
  [[ -n "$previous" ]] || previous="$current"

  if [[ "$current" == "$sha" ]] && wait_healthy; then
    echo "Already at $sha and healthy; nothing to do."
    echo "$sha" >"$good_file"
    return 0
  fi

  echo "Deploying $sha (last known good: $previous)"
  git fetch --prune origin main </dev/null
  git cat-file -e "$sha^{commit}" # fail early if the commit isn't on the VPS's fetch

  if deploy "$sha" && wait_healthy; then
    echo "$sha" >"$good_file"
    echo "Deployed $sha"
    docker image prune -f >/dev/null </dev/null
    return 0
  fi

  echo "::error::Deploy of $sha failed" >&2
  docker compose logs --tail=60 "$service" </dev/null >&2 || true

  if [[ "$previous" == "$sha" ]]; then
    echo "::error::No earlier known-good commit to roll back to; manual intervention needed" >&2
    return 1
  fi

  echo "Rolling back to $previous" >&2
  if deploy "$previous" && wait_healthy; then
    echo "Rolled back to $previous" >&2
  else
    echo "::error::Rollback to $previous is not healthy either; manual intervention needed" >&2
  fi
  return 1
}

main "$@"
