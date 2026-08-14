// Single source for the API base URL.
// Same-origin `/api/v1` when served over HTTPS (behind the Caddy reverse proxy), or the
// backend port directly for local HTTP Docker dev.
export const API_BASE_URL =
  typeof location !== "undefined" && location.protocol === "https:"
    ? "/api/v1"
    : `http://${typeof location !== "undefined" ? location.hostname : "localhost"}:8000/api/v1`;
