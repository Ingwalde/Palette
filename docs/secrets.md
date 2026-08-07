# Secrets management (SOPS + age)

Production secrets (SECRET_KEY, RESEND_API_KEY, DEFAULT_ADMIN_PASSWORD, POSTGRES_PASSWORD, …)
are stored **encrypted** in git as `secrets.enc.env` and decrypted at deploy time to
`backend/.env`. The plaintext `backend/.env` is git-ignored and never committed; the age
**private** key lives only on the machines that need to decrypt and is never committed.

This keeps secrets version-controlled and reviewable without exposing their values.

## One-time setup

Install [`sops`](https://github.com/getsops/sops) and [`age`](https://github.com/FiloSottile/age),
then generate a keypair:

```bash
age-keygen -o age.key
# prints: Public key: age1................................................
```

- Put the **public** key into `.sops.yaml` (replace `age1REPLACE_WITH_YOUR_PUBLIC_KEY`).
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

Then each deploy decrypts before starting the stack:

```bash
git pull origin main
sops --decrypt secrets.enc.env > backend/.env
docker compose up -d --build
```

## Rotating a secret

`sops secrets.enc.env` → change the value → save → commit → redeploy. To rotate the age key,
generate a new one, run `sops updatekeys secrets.enc.env`, and replace the key on each machine.
