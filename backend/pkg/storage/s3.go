package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
)

// S3Storage implements Storage interface for S3-compatible object storage (AWS S3, MinIO)
type S3Storage struct {
	client   *s3.S3
	uploader *s3manager.Uploader
	bucket   string
	region   string
	endpoint string
}

// NewS3Storage creates a new S3-compatible storage backend
func NewS3Storage(endpoint, region, accessKey, secretKey, bucket string, pathStyle bool) (*S3Storage, error) {
	if bucket == "" {
		return nil, fmt.Errorf("bucket name is required")
	}

	// Create AWS session
	awsConfig := &aws.Config{
		Region:           aws.String(region),
		Credentials:      credentials.NewStaticCredentials(accessKey, secretKey, ""),
		S3ForcePathStyle: aws.Bool(pathStyle), // Required for MinIO
	}

	if endpoint != "" {
		awsConfig.Endpoint = aws.String(endpoint)
	}

	sess, err := session.NewSession(awsConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	return &S3Storage{
		client:   s3.New(sess),
		uploader: s3manager.NewUploader(sess),
		bucket:   bucket,
		region:   region,
		endpoint: endpoint,
	}, nil
}

func (s *S3Storage) Put(ctx context.Context, key string, data io.Reader, size int64, contentType string) error {
	input := &s3manager.UploadInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        data,
		ContentType: aws.String(contentType),
	}

	// Note: s3manager.Uploader doesn't use ContentLength directly
	// It handles streaming automatically based on the io.Reader

	_, err := s.uploader.UploadWithContext(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to upload to S3: %w", err)
	}

	return nil
}

func (s *S3Storage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	result, err := s.client.GetObjectWithContext(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get object from S3: %w", err)
	}

	return result.Body, nil
}

func (s *S3Storage) Delete(ctx context.Context, key string) error {
	input := &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	_, err := s.client.DeleteObjectWithContext(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to delete object from S3: %w", err)
	}

	return nil
}

func (s *S3Storage) List(ctx context.Context, prefix string) ([]string, error) {
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucket),
		Prefix: aws.String(prefix),
	}

	var keys []string
	err := s.client.ListObjectsV2PagesWithContext(ctx, input, func(page *s3.ListObjectsV2Output, lastPage bool) bool {
		for _, obj := range page.Contents {
			if obj.Key != nil {
				keys = append(keys, *obj.Key)
			}
		}
		return !lastPage
	})

	if err != nil {
		return nil, fmt.Errorf("failed to list objects from S3: %w", err)
	}

	return keys, nil
}

func (s *S3Storage) Exists(ctx context.Context, key string) (bool, error) {
	input := &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	_, err := s.client.HeadObjectWithContext(ctx, input)
	if err != nil {
		if strings.Contains(err.Error(), "NotFound") || strings.Contains(err.Error(), "404") {
			return false, nil
		}
		return false, fmt.Errorf("failed to check object existence: %w", err)
	}

	return true, nil
}

func (s *S3Storage) URL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	// Check if object exists first
	exists, err := s.Exists(ctx, key)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", fmt.Errorf("object not found: %s", key)
	}

	// Generate presigned URL
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	req, _ := s.client.GetObjectRequest(input)
	url, err := req.Presign(expiry)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return url, nil
}

func (s *S3Storage) Stream(ctx context.Context, key string, offset, length int64) (io.ReadCloser, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	// Set Range header if offset or length specified
	if offset > 0 || length > 0 {
		var rangeHeader string
		if length > 0 {
			rangeHeader = fmt.Sprintf("bytes=%d-%d", offset, offset+length-1)
		} else {
			rangeHeader = fmt.Sprintf("bytes=%d-", offset)
		}
		input.Range = aws.String(rangeHeader)
	}

	result, err := s.client.GetObjectWithContext(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to stream object from S3: %w", err)
	}

	return result.Body, nil
}
