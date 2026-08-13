# Secrets management (SOPS + age)

Production secrets (SECRET_KEY, RESEND_API_KEY, DEFAULT_ADMIN_PASSWORD, POSTGRES_PASSWORD, …)
are stored **encrypted** in git as `secrets.enc.env` and decrypted at deploy time to
`backend/.env`. The plaintext `backend/.env` is git-ignored and never committed; the age
**private** key lives only on the machines that need to decrypt and is never committed.

This keeps secrets version-controlled and reviewable without exposing their values.

## Production vs staging

They must not share a file, and today they do — see the migration below. Two separate
encrypted files, one per environment:

| File | Decrypts to | Used by |
| --- | --- | --- |
| `secrets/prod.enc.env` | `backend/.env` | `.github/workflows/deploy.yml` |
| `secrets/staging.enc.env` | `backend/.env.staging` | `docker-compose.staging.yml` |

Staging gets its **own** `SECRET_KEY`, `POSTGRES_PASSWORD` and `DEFAULT_ADMIN_PASSWORD`, and
has `RESEND_API_KEY` / `SENTRY_DSN` blanked so it cannot email real users or report into the
production Sentry project.

### Migration (one-time, on the VM)

`secrets.enc.env` picked up a second copy of `POSTGRES_DB`, `DEFAULT_ADMIN_USERNAME`,
`DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` — staging values appended to the production
file. dotenv resolves duplicates **last-wins**, so production has been running on the second
block all along, quietly, including for the admin password.

Splitting the file needs the age private key, so it has to happen on the machine that holds
it:

```bash
cd ~/Palette
bash scripts/split-secrets.sh     # prints key names only, never values
```

The script keeps the last value for each key, so `secrets/prod.enc.env` reproduces exactly
what production runs today — picking the first block instead would silently repoint
`POSTGRES_DB`. It then seeds `secrets/staging.enc.env` with freshly generated credentials.
Follow the next-steps it prints; `deploy.yml`, `docker-compose.staging.yml`, `.sops.yaml` and
this document still reference the old single file until the split files are committed.

### Key backup

`.sops.yaml` currently lists a single age recipient, and its private half exists only on the
VM. Losing that machine means losing every secret in the repo irrecoverably. Generate a second
keypair, add its public key as an extra `age:` recipient, run `sops updatekeys` on each file,
and store that private key somewhere off the VM.

## One-time setup

Install [`sops`](https://github.com/getsops/sops) and [`age`](https://github.com/FiloSottile/age),
then generate a keypair:

```bash
age-keygen -o age.key
# prints: Public key: age1................................................
```

- Put the **public** key into `.sops.yaml` as an `age:` recipient (one is already configured;
  add yours alongside it rather than replacing it, or existing files stop decrypting).
- Keep `age.key` (the **private** key) safe. It is already covered by `.gitignore`.

## Encrypt / edit secrets

Create the plaintext once (from `backend/.env.example`), then encrypt it:

```bash
sops --encrypt --input-type dotenv --output-type dotenv backend/.env > secrets.enc.env
git add secrets.enc.env      # safe to commit — it is encrypted
```

To edit later (opens your editor with the decrypted content, re-encrypts on save):

```bash
sops secrets.enc.env
```

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
git pull origin main
sops --decrypt --input-type dotenv --output-type dotenv secrets.enc.env > backend/.env
docker compose up -d --build
```

## Rotating a secret

`sops secrets.enc.env` → change the value → save → commit → redeploy. To rotate the age key,
generate a new one, run `sops updatekeys secrets.enc.env`, and replace the key on each machine.
