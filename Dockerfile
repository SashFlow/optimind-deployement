FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache libc6-compat
RUN corepack enable


FROM base AS builder
WORKDIR /app

# Copy the full monorepo to allow turbo to compute a pruned graph for web.
COPY . .

RUN pnpm dlx turbo@^2.8.17 prune --scope=@repo/web --docker


FROM base AS installer
WORKDIR /app

# Install dependencies from the pruned workspace for better layer caching.
COPY --from=builder /app/out/json/ ./
RUN pnpm install --frozen-lockfile

# Copy full pruned source and build only the web app and its deps.
COPY --from=builder /app/out/full/ ./
RUN pnpm turbo run build --filter=@repo/web...


FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Owned by nextjs: withSpatialReal / withAvatarkit write into package .cache on
# config load, and Next writes to apps/web/.next/cache at runtime.
COPY --from=installer --chown=nextjs:nodejs /app/apps/web ./apps/web
COPY --from=installer --chown=nextjs:nodejs /app/packages ./packages
COPY --from=installer --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=installer /app/package.json ./package.json
COPY --from=installer /app/pnpm-lock.yaml ./pnpm-lock.yaml

# OptiModel / Spatius WASM + packs must be present at runtime. `_avatarkit` is
# gitignored and only created when next.config loads during build — assert it
# made it into the image so model loads fail loudly at build time, not in prod.
RUN test -d apps/web/public/_avatarkit \
	&& test -n "$(ls -A apps/web/public/_avatarkit/*.wasm 2>/dev/null)" \
	&& test -f apps/web/public/spatialreal/index.json \
	&& test -d apps/web/public/spatialreal/avatars/samira-a0a234f5 \
	&& test -d apps/web/public/spatialreal/avatars/sanjay-3c409ac5

# COPY --from=installer /app/apps/web/.next/standalone ./
# COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static
# COPY --from=installer /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

# pnpm doesn't hoist `next` to the root; it lives in apps/web/node_modules.
WORKDIR /app/apps/web
CMD ["node", "node_modules/next/dist/bin/next", "start"]
