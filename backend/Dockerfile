FROM python:3.12-slim

# Faster, cleaner Python in containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps first for layer caching.
#
# INSTALL_DEV=true additionally installs the test/lint toolchain. The `tests` service in
# docker-compose.yml builds with it; production does not, so pytest and friends stay out of
# the deployed image.
ARG INSTALL_DEV=false
COPY requirements.txt requirements-dev.txt ./
RUN if [ "$INSTALL_DEV" = "true" ]; then \
        pip install --no-cache-dir -r requirements-dev.txt; \
    else \
        pip install --no-cache-dir -r requirements.txt; \
    fi

# App code + database migrations
COPY app ./app
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic

# Run as non-root
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

# --proxy-headers + --forwarded-allow-ips lets uvicorn trust X-Forwarded-For from the
# reverse proxy (Caddy), so the app sees the real client IP. Without this, every request
# looks like it comes from the Docker gateway and rate limits are shared across all users.
# Trusting every forwarder is only safe while nothing but the proxy can open a connection here:
# whoever reaches this port directly can name any X-Forwarded-For they like and get a fresh
# rate-limit bucket per request. That is why docker-compose.yml publishes the port on 127.0.0.1
# — the two decisions are one decision, and changing either alone reopens the hole.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
