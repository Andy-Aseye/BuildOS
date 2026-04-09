FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/
RUN npm ci --workspace=@buildos/api --include-workspace-root

FROM base AS build
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
ARG RAILWAY_GIT_COMMIT_SHA
RUN echo "build:${RAILWAY_GIT_COMMIT_SHA}" > /tmp/.buildstamp
COPY . .
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=@buildos/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/package.json apps/api/package.json

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main"]
