# Secrets management (SOPS + age)

Production secrets (SECRET_KEY, RESEND_API_KEY, DEFAULT_ADMIN_PASSWORD, POSTGRES_PASSWORD, …)
are stored **encrypted** in git under `secrets/` and decrypted at deploy time to
`backend/.env`. The plaintext `backend/.env` is git-ignored and never committed; the age
**private** key lives only on the machines that need to decrypt and is never committed.

This keeps secrets version-controlled and reviewable without exposing their values.

## Production vs staging

Two separate encrypted files, one per environment:

| File                      | Decrypts to            | Used by                        |
| ------------------------- | ---------------------- | ------------------------------ |
| `secrets/prod.enc.env`    | `backend/.env`         | `.github/workflows/deploy.yml` |
| `secrets/staging.enc.env` | `backend/.env.staging` | `docker-compose.staging.yml`   |

Staging gets its **own** `SECRET_KEY`, `POSTGRES_PASSWORD` and `DEFAULT_ADMIN_PASSWORD`, and
has `RESEND_API_KEY` / `SENTRY_DSN` blanked so it cannot email real users or report into the
production Sentry project.

Bring staging up with its own secrets decrypted first:

```bash
sops --decrypt --input-type dotenv --output-type dotenv \
  secrets/staging.enc.env > backend/.env.staging
docker compose -p palette-staging -f docker-compose.yml -f docker-compose.staging.yml up -d
```

`docker-compose.staging.yml` uses `env_file: !override`, so the inherited production
`backend/.env` is replaced rather than merged — a production value cannot leak into staging
through a key staging forgot to set.

### History: why they were split

The single `secrets.enc.env` had picked up a second copy of `POSTGRES_DB`,
`DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` — staging values
appended to the production file. dotenv resolves duplicates **last-wins**, so production had
been running on the second block all along, quietly, admin password included.

`scripts/split-secrets.sh` performed the split on the VM (the only machine with the private
key). It resolves duplicates last-wins, so `secrets/prod.enc.env` reproduces exactly what
production was already running — taking the first block instead would have silently repointed
`POSTGRES_DB` at another database. Verified afterwards by hashing each value on both sides:
every key matched. The script is kept for reference and is not part of any routine flow.

### Key backup

`.sops.yaml` lists **two** age recipients, and either private half alone decrypts every file:
one on the VM, one on the workstation, both at `~/.config/sops/age/keys.txt`. Losing one
machine is now an inconvenience rather than the permanent loss of every secret in the repo.

Keep it that way. When a machine is retired, add its replacement as a recipient and run
`sops updatekeys` **before** wiping the old key — re-keying has to decrypt before it can
re-encrypt, so the last surviving key is also the only thing that can grant a new one.

Re-keying happens from a machine that already holds one of the private keys:

```bash
sops updatekeys secrets/prod.enc.env
sops updatekeys secrets/staging.enc.env
```

Do it in a scratch copy rather than the VM's deploy checkout — the deploy refuses to overwrite
local modifications, so editing files in place there aborts the next release.

## One-time setup

Install [`sops`](https://github.com/getsops/sops) and [`age`](https://github.com/FiloSottile/age),
then generate a keypair:

```bash
age-keygen -o age.key
# prints: Public key: age1................................................
```

- Put the **public** key into `.sops.yaml` as an `age:` recipient — the list is comma-separated
  with no spaces, since sops splits on the comma and does not trim. Add yours alongside the two
  already configured rather than replacing them, or the existing files stop decrypting.
- Keep `age.key` (the **private** key) safe. It is already covered by `.gitignore`.

On Windows, note that sops matches `path_regex` against the path your shell hands it, so
`secrets\prod.enc.env` needs the rule to accept a backslash. The committed rule already does; a
forward-slash-only rule fails with the unhelpful `no matching creation rules found` even though
the file is right there.

## Encrypt / edit secrets

Create the plaintext once (from `backend/.env.example`), then encrypt it:

```bash
sops --encrypt --input-type dotenv --output-type dotenv backend/.env > secrets/prod.enc.env
git add secrets/prod.enc.env      # safe to commit — it is encrypted
```

To edit later (opens your editor with the decrypted content, re-encrypts on save):

```bash
sops secrets/prod.enc.env
sops secrets/staging.enc.env
```

Edit them one at a time and never paste a value from one into the other — keeping the two
sets disjoint is the whole point of the split.

## Deploy (VM)

Put the private key on the VM once:

```bash
mkdir -p ~/.config/sops/age
# paste the contents of age.key into:
nano ~/.config/sops/age/keys.txt
```

Then each deploy decrypts before starting the stack (the auto-deploy workflow does this for
you — see `.github/workflows/deploy.yml`):

```bash
git fetch origin && git checkout --detach <sha>
sops --decrypt --input-type dotenv --output-type dotenv secrets/prod.enc.env > backend/.env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Rotating a secret

`sops secrets/prod.enc.env` → change the value → save → commit → redeploy. To rotate the age
key, generate a new one, run `sops updatekeys` on **both** files, and replace the key on each
machine.
