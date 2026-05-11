# Git Cleanup Guide

The uploaded ZIP/archive may contain local files that should not be committed.

## Do not commit

```text
.git/
backend/.venv/
backend/.env
backend/palette.db
__pycache__/
*.zip
PATCH_README.md
```

## Check repository status

```bash
git status
```

## If virtual environment was already added

```bash
git rm -r --cached backend/.venv
```

## If local database was already added

```bash
git rm --cached backend/palette.db
```

## If `.env` was already added

```bash
git rm --cached backend/.env
```

## Recommended commit for v3.1 docs

```bash
git add README.md CHANGELOG.md ROADMAP.md SECURITY.md RELEASE_NOTES_v3_1.md docs/
git commit -m "Update documentation for Palette v3.1"
```

## Recommended tag

```bash
git tag v3.1.0
git push origin v3.1.0
```
