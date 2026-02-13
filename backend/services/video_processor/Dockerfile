FROM node:20-alpine

WORKDIR /app

# Install FFmpeg and dumb-init for signal handling, curl for health checks
RUN apk add --no-cache ffmpeg dumb-init curl

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy application source
COPY src/ src/

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001

# Create temp directory for video processing and set ownership
RUN mkdir -p /tmp/video_processor && \
    chown -R appuser:appuser /app /tmp/video_processor

USER appuser

EXPOSE 5005

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5005/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
