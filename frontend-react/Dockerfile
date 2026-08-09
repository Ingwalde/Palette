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
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
