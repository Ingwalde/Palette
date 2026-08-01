FROM python:3.12-slim

# Faster, cleaner Python in containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY app ./app

# Run as non-root
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

# --proxy-headers + --forwarded-allow-ips lets uvicorn trust X-Forwarded-For from the
# reverse proxy (Caddy), so the app sees the real client IP. Without this, every request
# looks like it comes from the Docker gateway and rate limits are shared across all users.
# Port 8000 is only reachable via the proxy (firewalled), so trusting all forwarders is safe.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
