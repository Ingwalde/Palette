# Security policy

Palette is a portfolio project, not a hosted service with paying users — but it does run a live
deployment with real accounts on it, and the auth work in it is meant to be looked at closely.
If you find something wrong, please report it.

## Supported versions

Only the latest release is supported. Fixes land on `main` and ship in the next version; there
are no backports.

## Reporting a vulnerability

Use GitHub's private reporting: **[Security → Report a
vulnerability](https://github.com/Ingwalde/Palette/security/advisories/new)**. That opens a
private thread visible only to the maintainer, so the issue is not public while it is being
fixed.

Please do not open a public issue for anything exploitable.

Useful in a report, in rough order of usefulness:

- what an attacker gets — read another user's data, act as them, run code, deny service;
- the smallest set of steps that reproduces it, including whether it needs an account;
- the version or commit you tested against.

Expect a first reply within a week. Because this is a solo project, that is a realistic
estimate rather than an SLA. You will be credited in the changelog entry for the fix unless you
would rather not be.

## Scope

In scope: the FastAPI backend, the React frontend, the Docker and deployment configuration, and
the CI workflows in this repository.

Out of scope, because they are not this project's to fix:

- vulnerabilities in third-party dependencies with no Palette-specific exploit path — report
  those upstream; Dependabot and CodeQL already watch this repository;
- findings that only apply to a local development configuration, such as `COOKIE_SECURE=false`
  or the seeded default admin, both of which exist for running the stack on plain http;
- missing hardening headers on endpoints that serve no content, and similar scanner output with
  no demonstrated impact;
- social engineering, physical access, or denial of service by volume.

## What is already deliberate

Some behaviour that looks like a finding is a documented decision. Before reporting, it is worth
checking [docs/auth.md](docs/auth.md):

- **Email verification is not enforced at login.** Unverified accounts have full access; the
  flag drives a profile banner and the resend endpoint. See "Email verification is not
  enforced".
- **Access tokens live 24 hours by default.** They are revocable in spite of being stateless —
  each carries a `token_version` claim checked against the user row on every request. See
  "Revocation".
- **`csrf_token` is readable by JavaScript.** It is the client's half of a double-submit pair
  and carries no authority alone. The two credential cookies are httpOnly.
- **Password rules enforce length, not character classes.** See "Password requirements".
