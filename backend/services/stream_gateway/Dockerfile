FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git for module downloads.
RUN apk add --no-cache git

# Copy go module files and download dependencies first (layer caching).
COPY go.mod go.sum ./
RUN go mod download

# Copy source code.
COPY . .

# Build the binary with optimizations.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a -installsuffix cgo \
    -o server .

# Final stage: minimal runtime image.
FROM alpine:3.19

RUN apk add --no-cache ca-certificates wget tzdata

WORKDIR /app

# Copy the binary from builder.
COPY --from=builder /app/server .

# Create non-root user.
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 5003

ENV PORT=5003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5003/health || exit 1

CMD ["./server"]
