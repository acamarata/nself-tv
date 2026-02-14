package storage

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"library_service/internal/config"
)

// MinioClient wraps the MinIO SDK client with convenience methods for the
// library service's storage needs.
type MinioClient struct {
	client *minio.Client
}

// NewMinioClient creates a new MinIO client from the application configuration.
func NewMinioClient(cfg *config.Config) (*MinioClient, error) {
	client, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	return &MinioClient{client: client}, nil
}

// EnsureBucket creates the bucket if it does not already exist.
func (m *MinioClient) EnsureBucket(ctx context.Context, bucket string) error {
	exists, err := m.client.BucketExists(ctx, bucket)
	if err != nil {
		return fmt.Errorf("failed to check bucket %q: %w", bucket, err)
	}
	if exists {
		return nil
	}

	err = m.client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
	if err != nil {
		return fmt.Errorf("failed to create bucket %q: %w", bucket, err)
	}
	return nil
}

// UploadFile uploads a local file to the specified bucket and object key.
func (m *MinioClient) UploadFile(ctx context.Context, bucket, key, filePath string) error {
	_, err := m.client.FPutObject(ctx, bucket, key, filePath, minio.PutObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to upload %q to %s/%s: %w", filePath, bucket, key, err)
	}
	return nil
}

// DownloadFile downloads an object from MinIO to a local file path.
func (m *MinioClient) DownloadFile(ctx context.Context, bucket, key, destPath string) error {
	err := m.client.FGetObject(ctx, bucket, key, destPath, minio.GetObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to download %s/%s to %q: %w", bucket, key, destPath, err)
	}
	return nil
}

// GetPresignedURL generates a pre-signed URL for downloading an object.
// The URL is valid for the given expiry duration.
func (m *MinioClient) GetPresignedURL(ctx context.Context, bucket, key string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	presignedURL, err := m.client.PresignedGetObject(ctx, bucket, key, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL for %s/%s: %w", bucket, key, err)
	}
	return presignedURL.String(), nil
}

// StatObject returns information about an object without downloading it.
func (m *MinioClient) StatObject(ctx context.Context, bucket, key string) (*minio.ObjectInfo, error) {
	info, err := m.client.StatObject(ctx, bucket, key, minio.StatObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to stat %s/%s: %w", bucket, key, err)
	}
	return &info, nil
}

// DeleteObject removes an object from the specified bucket.
func (m *MinioClient) DeleteObject(ctx context.Context, bucket, key string) error {
	err := m.client.RemoveObject(ctx, bucket, key, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete %s/%s: %w", bucket, key, err)
	}
	return nil
}
