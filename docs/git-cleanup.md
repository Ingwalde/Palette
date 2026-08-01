# Git Cleanup Guide

The uploaded ZIP/archive may contain local files that should not be committed.

## Do not commit

```text
.git/
backend/.venv/
backend/.env
*.db
__pycache__/
.claude/
graphify-out/
*.zip
```

All of these are already covered by `.gitignore`.

## Check repository status

```bash
git status
```

## If virtual environment was already added

```bash
git rm -r --cached backend/.venv
```

## If a local database file was already added

```bash
git rm --cached backend/palette.db
```

## If `.env` was already added

```bash
git rm --cached backend/.env
```

## Recommended commit for v4.0 docs

```bash
git add README.md CHANGELOG.md ROADMAP.md docs/
git commit -m "Update documentation for Palette v4.0"
```

## Recommended tag

```bash
git tag v4.0.0
git push origin v4.0.0
```
