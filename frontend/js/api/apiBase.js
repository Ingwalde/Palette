// Single source for the API base URL used by every api/* module.
// Same-origin `/api` when served over HTTPS (behind the Caddy reverse proxy), or the
// backend port directly for local HTTP Docker dev.
export const API_BASE_URL =
  location.protocol === "https:" ? "/api" : `http://${location.hostname}:8000/api`;
