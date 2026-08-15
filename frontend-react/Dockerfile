# Build the Vite/React app, then serve the static bundle with nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Optional observability: when VITE_SENTRY_DSN is passed as a build arg it is inlined into the
# bundle (Vite only exposes VITE_-prefixed vars). Empty = Sentry stays off, SDK not bundled.
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Source-map upload. Org, project and release are not secret and travel as build args; the auth
# token is mounted as a BuildKit secret for this one step, because a build arg is recorded in
# the image's history and would leak a credential that can write to the Sentry project.
#
# All three are optional: with no token the Vite config skips the plugin entirely, so a local
# build and a pull-request build behave exactly as before.
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ARG SENTRY_RELEASE=""
RUN --mount=type=secret,id=sentry_auth_token,required=false \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
    SENTRY_ORG="$SENTRY_ORG" \
    SENTRY_PROJECT="$SENTRY_PROJECT" \
    SENTRY_RELEASE="$SENTRY_RELEASE" \
    npm run build
# Vite emits hidden source maps (no sourceMappingURL comment), so nothing links to them and
# they must not ship: serving them publishes the whole TypeScript source.
RUN find dist -name '*.map' -delete

FROM nginx:alpine
# The entrypoint renders /etc/nginx/templates/*.template through envsubst. The filter keeps it
# to CONNECT_SRC_EXTRA so nginx's own $uri is not substituted away.
ENV NGINX_ENVSUBST_FILTER="CONNECT_SRC_EXTRA"
ENV CONNECT_SRC_EXTRA=""
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
