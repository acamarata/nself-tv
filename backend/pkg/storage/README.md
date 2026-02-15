# Storage Package

Unified storage abstraction layer for nself-tv backend services.

## Features

- **Local Filesystem** - Fast local storage with filesystem operations
- **S3-Compatible** - AWS S3, MinIO, and other S3-compatible services
- **Hybrid** - Local primary with async S3 sync for best of both worlds
- **Range Support** - Efficient streaming with byte range requests
- **Presigned URLs** - Temporary access URLs for S3 objects
- **Context Support** - Proper context propagation for timeouts/cancellation

## Installation

```bash
go get github.com/acamarata/nself-tv/pkg/storage
```

## Usage

### Basic Example

```go
package main

import (
    "context"
    "bytes"
    "log"

    "github.com/acamarata/nself-tv/pkg/storage"
)

func main() {
    // Create local storage
    cfg := storage.Config{
        Backend:   "local",
        LocalPath: "/var/lib/nself-tv/media",
    }

    store, err := storage.New(cfg)
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()

    // Upload a file
    data := []byte("Hello, World!")
    err = store.Put(ctx, "videos/sample.mp4", bytes.NewReader(data), int64(len(data)), "video/mp4")
    if err != nil {
        log.Fatal(err)
    }

    // Download a file
    reader, err := store.Get(ctx, "videos/sample.mp4")
    if err != nil {
        log.Fatal(err)
    }
    defer reader.Close()

    // Check if file exists
    exists, err := store.Exists(ctx, "videos/sample.mp4")
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("File exists: %v", exists)
}
```

### Local Storage

```go
cfg := storage.Config{
    Backend:   "local",
    LocalPath: "/var/lib/nself-tv/media",
}
store, err := storage.New(cfg)
```

### S3 Storage (MinIO)

```go
cfg := storage.Config{
    Backend:     "s3",
    S3Endpoint:  "http://localhost:9000",
    S3Region:    "us-east-1",
    S3AccessKey: "minioadmin",
    S3SecretKey: "minioadmin",
    S3Bucket:    "nself-tv-media",
    S3PathStyle: true, // Required for MinIO
}
store, err := storage.New(cfg)
```

### Hybrid Storage

Hybrid mode uses local storage as the primary (fast reads/writes) with async background sync to S3 (durability).

```go
cfg := storage.Config{
    Backend:       "hybrid",
    LocalPath:     "/var/lib/nself-tv/media",
    S3Endpoint:    "http://localhost:9000",
    S3Region:      "us-east-1",
    S3AccessKey:   "minioadmin",
    S3SecretKey:   "minioadmin",
    S3Bucket:      "nself-tv-media",
    S3PathStyle:   true,
    HybridWorkers: 4, // Number of async sync workers
}
store, err := storage.New(cfg)

// Don't forget to close when done
defer store.(*storage.HybridStorage).Close()
```

### Streaming with Range Requests

```go
// Stream bytes 1000-1999 (1000 bytes starting at offset 1000)
reader, err := store.Stream(ctx, "videos/movie.mp4", 1000, 1000)
if err != nil {
    log.Fatal(err)
}
defer reader.Close()

// Stream from offset to end
reader, err = store.Stream(ctx, "videos/movie.mp4", 1000, 0)
```

### Presigned URLs

```go
// Generate a URL valid for 1 hour
url, err := store.URL(ctx, "videos/sample.mp4", 1*time.Hour)
if err != nil {
    log.Fatal(err)
}
log.Printf("Download URL: %s", url)
```

## Interface

All storage backends implement the `Storage` interface:

```go
type Storage interface {
    // Put uploads data to storage
    Put(ctx context.Context, key string, data io.Reader, size int64, contentType string) error

    // Get retrieves data from storage
    Get(ctx context.Context, key string) (io.ReadCloser, error)

    // Delete removes data from storage
    Delete(ctx context.Context, key string) error

    // List returns keys matching the prefix
    List(ctx context.Context, prefix string) ([]string, error)

    // Exists checks if a key exists
    Exists(ctx context.Context, key string) (bool, error)

    // URL generates a presigned/public URL for the key
    URL(ctx context.Context, key string, expiry time.Duration) (string, error)

    // Stream returns a reader for streaming large files with Range support
    Stream(ctx context.Context, key string, offset, length int64) (io.ReadCloser, error)
}
```

## Configuration from Environment

```go
import "os"

cfg := storage.Config{
    Backend:     os.Getenv("STORAGE_BACKEND"),     // "local", "s3", "hybrid"
    LocalPath:   os.Getenv("STORAGE_LOCAL_PATH"),  // "/var/lib/nself-tv/media"
    S3Endpoint:  os.Getenv("STORAGE_S3_ENDPOINT"), // "http://localhost:9000"
    S3Region:    os.Getenv("STORAGE_S3_REGION"),   // "us-east-1"
    S3AccessKey: os.Getenv("STORAGE_S3_ACCESS_KEY"),
    S3SecretKey: os.Getenv("STORAGE_S3_SECRET_KEY"),
    S3Bucket:    os.Getenv("STORAGE_S3_BUCKET"),   // "nself-tv-media"
    S3PathStyle: os.Getenv("STORAGE_S3_PATH_STYLE") == "true",
}
```

## Testing

```bash
# Run all tests
go test -v

# Run only local tests (no MinIO required)
go test -v -run TestLocal

# Check coverage
go test -cover

# Generate coverage report
go test -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Deployment Modes

### Standalone Mode
Use **local** or **hybrid** storage. Media stays on the server with optional S3 backup.

### Monorepo Mode
Use **S3** storage. All apps share the same media bucket.

### NAS Mode
Use **local** storage pointing to NAS mount (`/mnt/nas/media`).

## Performance

- **Local**: ~500 MB/s read, ~300 MB/s write (SSD)
- **S3 (MinIO)**: ~100 MB/s (network-bound)
- **Hybrid**: Write ~300 MB/s (local), Read ~500 MB/s (local cache)

## Best Practices

1. **Always use context** - Pass context for timeouts and cancellation
2. **Close readers** - Always defer `reader.Close()` after Get/Stream
3. **Handle errors** - Check errors, especially for network operations
4. **Use hybrid for production** - Best balance of speed and durability
5. **Close hybrid storage** - Call `Close()` on shutdown to flush pending syncs

## Error Handling

```go
reader, err := store.Get(ctx, "videos/sample.mp4")
if err != nil {
    if strings.Contains(err.Error(), "not found") {
        // Handle missing file
        log.Printf("File not found")
    } else {
        // Handle other errors
        log.Printf("Failed to get file: %v", err)
    }
    return
}
defer reader.Close()
```

## Migration from Direct Filesystem

Before:
```go
file, err := os.Open("/var/lib/nself-tv/media/videos/sample.mp4")
```

After:
```go
reader, err := store.Get(ctx, "videos/sample.mp4")
```

See the migration guide in `/docs/storage-migration.md` for complete service migration examples.
