# syntax=docker/dockerfile:1
# Game server image; the worker runs the same image with ROLE=worker.
# Build from the repository root:
#   docker build -f infra/server.Dockerfile -t helyx-server:local .

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    HUSKY=0 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Download every package from the lockfile first, so source edits keep this layer cached.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch

COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline
RUN pnpm turbo build --filter=@helyx/server...
# The bundle inlines the workspace packages; only npm production dependencies are needed at runtime.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @helyx/server deploy --prod --legacy /out

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    ROLE=game \
    PORT=2567 \
    WORKER_HEALTH_PORT=2568
WORKDIR /app

# Files stay owned by root so the unprivileged process cannot modify its own code.
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/server/dist ./dist
COPY --chmod=0755 infra/server-healthcheck.sh /usr/local/bin/helyx-healthcheck

USER node
EXPOSE 2567 2568
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 CMD ["helyx-healthcheck"]
CMD ["node", "dist/main.js"]
