# Git Checklist for Palette v3.0

Before pushing v3.0 to GitHub, make sure these files/folders are not committed:

```text
.git/
backend/.venv/
backend/.env
backend/*.db
backend/app/__pycache__/
```

These files should be committed:

```text
frontend/
backend/app/
backend/requirements.txt
backend/.env.example
docs/
README.md
CHANGELOG.md
ROADMAP.md
.gitignore
start_project.bat
```

## Recommended commands

```bash
git status
git add .
git commit -m "Release Palette v3.0 full-stack backend API update"
git tag v3.0.0
git push
git push origin v3.0.0
```

If you work in a separate branch:

```bash
git switch -c v3.0-backend-api
git add .
git commit -m "Release Palette v3.0 full-stack backend API update"
git push -u origin v3.0-backend-api
git tag v3.0.0
git push origin v3.0.0
```

If local/generated files were already tracked by Git, remove them from tracking:

```bash
git rm -r --cached backend/.venv
git rm --cached backend/.env
git rm -r --cached backend/app/__pycache__
git rm --cached backend/*.db
```

Then commit the cleanup.
