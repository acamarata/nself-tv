FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy application source
COPY src/ src/

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 5006

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5006/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
