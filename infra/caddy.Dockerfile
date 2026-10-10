# syntax=docker/dockerfile:1
# Edge image: Caddy with the built web client baked in, so a release is one set of tagged images.
# Build from the repository root:
#   docker build -f infra/caddy.Dockerfile -t helyx-caddy:local .

ARG NODE_IMAGE=node:24-alpine
ARG CADDY_IMAGE=caddy:2.10-alpine

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    HUSKY=0 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch

COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline

# Client build-time settings; they end up in public JavaScript, so never put secrets here.
ARG VITE_PUBLIC_URL=
ARG VITE_ENABLE_LAGSIM=false
ENV VITE_PUBLIC_URL=${VITE_PUBLIC_URL} \
    VITE_ENABLE_LAGSIM=${VITE_ENABLE_LAGSIM}
RUN pnpm turbo build --filter=@helyx/client...

FROM ${CADDY_IMAGE} AS runtime
COPY infra/Caddyfile /etc/caddy/Caddyfile
# Only the public client build is copied; nothing restricted to signed-in players ships here.
COPY --from=build /repo/apps/client/dist /srv/client
# The content bundle lands in /srv/content once the content build exists.
RUN mkdir -p /srv/content \
    && DOMAIN=localhost ACME_EMAIL=build@example.com \
       caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
