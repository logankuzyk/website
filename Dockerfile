# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.js file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:22.17.0-alpine AS base
# libc6-compat: see https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# vips / vips-cpp / vips-heif: the system libvips `sharp` is built against (see the `deps`
# stage). The npm-bundled sharp binary ships a cut-down libvips whose libaom has no
# high-bit-depth decoder and no dav1d, so it cannot decode 10-bit/HDR AVIF or (HEVC) HEIC.
# Alpine's libheif pulls a full libaom + libde265 + libx265. `vips-cpp` (libvips-cpp.so.42,
# what the sharp binding links) is a separate Alpine package from `vips` (libvips.so.42).
# All three are needed at runtime in `runner`, not just at build time.
# NOTE: sharp requires libvips >= its package.json `config.libvips`. Alpine 3.22 ships
# exactly 8.16.1; re-check `apk policy vips` when bumping the node base image.
RUN apk add --no-cache libc6-compat vips vips-cpp vips-heif

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Toolchain to compile sharp from source against the system libvips installed above.
RUN apk add --no-cache --virtual .gyp vips-dev build-base python3 pkgconf

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
# Force sharp's install script to build from source and link the system libvips instead
# of downloading its prebuilt binary. Requires node-addon-api + node-gyp (devDependencies).
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm install; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Fail the build here (not at runtime) if sharp isn't the from-source binding linked to
# the system libvips. Then drop the now-unused prebuilt binaries and the build toolchain.
RUN node -e "require('sharp')" \
  && ldd node_modules/sharp/src/build/Release/sharp-*.node | grep -q '/usr/lib/libvips.so' \
  && rm -rf node_modules/@img/sharp-libvips-* node_modules/@img/sharp-linuxmusl-* node_modules/@img/sharp-linux-* \
  && apk del .gyp


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Remove this line if you do not have this folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Media uploads (when not using R2)
RUN mkdir -p media && chown -R nextjs:nodejs media

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# The from-source sharp binding lives at node_modules/sharp/src/build/Release/*.node.
# Next's file tracer should copy it into the standalone output (sharp is in the default
# serverExternalPackages); copy the package explicitly too so a tracing miss can't ship a
# runtime without a working sharp.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
