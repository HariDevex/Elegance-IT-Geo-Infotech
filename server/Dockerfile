FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache tini

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/knexfile.js ./
COPY --from=builder /app/config ./config
COPY --from=builder /app/controller ./controller
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/seeds ./seeds
COPY --from=builder /app/index.js ./
COPY --from=builder /app/.eslintrc.json ./

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["tini", "--"]

CMD ["sh", "-c", "npx knex migrate:latest --knexfile knexfile.js && node index.js"]
