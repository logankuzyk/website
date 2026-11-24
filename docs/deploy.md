# Deploying to the VPS

Every push to `main` that passes CI triggers `.github/workflows/deploy.yml`. It SSHes into the
VPS and streams `scripts/deploy.sh`, which:

1. resets the VPS checkout to the pushed commit,
2. runs `docker compose up -d --build website` (the old container keeps serving until the new image is built; `mongo` is left alone),
3. polls the app from inside the container until it answers 3 times in a row (90s timeout),
4. on failure, redeploys the last known-good commit and fails the workflow run.

The last known-good commit is recorded in `.git/deploy-last-good` on the VPS, written only after a
deploy turns healthy.

Deploys are serialized (a `deploy` concurrency group in Actions, plus `flock` on the VPS).
You can also run it by hand from the Actions tab (**Deploy → Run workflow**), but only from `main`.
A manual run deploys `main`'s head even if CI is red on it, so check CI first.

## One-time VPS setup

On the VPS, as the user that runs Docker (referred to as `deploy` below).

First add a read-only [deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
to the repo (or make the clone use HTTPS with a token), so the clone and later `git fetch`es work.
The deploy overwrites the checkout with `git reset --hard`, so don't keep local edits to tracked
files there; `.env` is untracked and safe.

```bash
# 1. Clone the repo and create .env (see .env.example)
git clone git@github.com:logankuzyk/website.git ~/website
cp ~/website/.env.example ~/website/.env   # then fill in real values

# 2. Shared network the edge Nginx uses (see docker-compose.yml)
docker network create website-net

# 3. First start, to confirm the stack works before automating it
cd ~/website && docker compose up -d --build
```

Create a dedicated SSH key for Actions (don't reuse a personal one):

```bash
ssh-keygen -t ed25519 -f deploy_key -C "github-actions-deploy" -N ""
cat deploy_key.pub >> ~/.ssh/authorized_keys   # on the VPS, as `deploy`
```

Optionally restrict it in `authorized_keys` with `restrict,` in front of the key.

## GitHub configuration

Repo → Settings → Environments → create **production**. Under **Deployment branches and tags**,
select **Selected branches and tags** and allow only `main`. This is required: the environment's
secrets (the VPS SSH key) must never be released to runs from other branches. Add required reviewers
there too if you want a manual approval gate before each deploy.

Secrets (on the `production` environment):

| Name              | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `VPS_HOST`        | VPS hostname or IP                                                 |
| `VPS_USER`        | the `deploy` user                                                  |
| `VPS_SSH_KEY`     | contents of the private `deploy_key` file                          |
| `VPS_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <VPS_HOST>`, checked against the fingerprint you trust. Scan the exact value you put in `VPS_HOST` (hostname vs IP), or the host check will reject the connection |

Variables (on the `production` environment):

| Name       | Value                                         |
| ---------- | --------------------------------------------- |
| `VPS_PATH` | absolute path of the clone, e.g. `/home/deploy/website` |

Then delete the local `deploy_key` and `deploy_key.pub`.

## Notes

- `.env` lives only on the VPS and is never touched by the deploy.
- The health check accepts any non-5xx response, since `/` may 301 to the canonical host.
- Schema changes: Payload's MongoDB adapter has no migration step in this flow, so deploys that
  change collections rely on Payload applying them at boot. Rollback redeploys the old code but
  does not undo anything Payload already applied to the database.
- If the rollback itself is unhealthy the run fails with an error annotation; SSH in and check
  `docker compose logs website`.
