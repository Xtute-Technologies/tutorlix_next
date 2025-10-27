########################################
# Stage 1 — builder
########################################
FROM node:18-alpine AS builder

# Install system deps needed for some build tools (optional)
RUN apk add --no-cache python3 make g++ && \
    addgroup -S builder && adduser -S builder -G builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

########################################
# Stage 2 — runtime (copy prod deps from builder)
########################################
FROM node:18-alpine AS runner

RUN apk add --no-cache wget

# create non-root user for safety
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10001

# Copy package.json (optional) and node_modules from builder
COPY --from=builder /app/package*.json ./
# copy node_modules produced in builder (includes prod deps)
COPY --from=builder /app/node_modules ./node_modules

# Copy built assets + source necessary to run start script
COPY --from=builder /app ./

# switch to non-root user
USER app

EXPOSE 10001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- --timeout=2 http://localhost:${PORT}/ || exit 1

CMD ["npm", "run", "start"]

