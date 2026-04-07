package storage

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
	client    *s3.Client
	presigner *s3.PresignClient
	bucket    string
	publicURL string // e.g. https://cdn.greggie.app or https://bucket.s3.amazonaws.com
	enabled   bool
)

// Init configures the S3-compatible storage from environment variables.
// Supports AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces.
func Init() {
	bucket = os.Getenv("S3_BUCKET")
	endpoint := os.Getenv("S3_ENDPOINT") // optional: for MinIO/R2/Spaces
	region := os.Getenv("S3_REGION")
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_SECRET_KEY")
	publicURL = os.Getenv("S3_PUBLIC_URL")

	if bucket == "" {
		env := os.Getenv("ENVIRONMENT")
		if env != "dev" && env != "test" {
			log.Println("storage: S3_BUCKET not set — uploads disabled")
		}
		return
	}
	if region == "" {
		region = "us-east-1"
	}

	ctx := context.Background()
	var opts []func(*config.LoadOptions) error
	opts = append(opts, config.WithRegion(region))

	if accessKey != "" && secretKey != "" {
		opts = append(opts, config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		))
	}

	cfg, err := config.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		log.Printf("storage: failed to load AWS config: %v", err)
		return
	}

	var s3Opts []func(*s3.Options)
	if endpoint != "" {
		s3Opts = append(s3Opts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(endpoint)
			o.UsePathStyle = true
		})
	}

	client = s3.NewFromConfig(cfg, s3Opts...)
	presigner = s3.NewPresignClient(client)

	if publicURL == "" {
		if endpoint != "" {
			publicURL = strings.TrimRight(endpoint, "/") + "/" + bucket
		} else {
			publicURL = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", bucket, region)
		}
	}

	enabled = true
	log.Printf("storage: S3 configured (bucket=%s, public=%s)", bucket, publicURL)
}

// Enabled returns true if S3 storage is configured.
func Enabled() bool {
	return enabled
}

// GeneratePresignedUpload creates a presigned PUT URL for direct client upload.
func GeneratePresignedUpload(key, contentType string) (uploadURL, objPublicURL string, err error) {
	if !enabled {
		return "", "", fmt.Errorf("storage not configured")
	}

	input := &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}

	result, err := presigner.PresignPutObject(context.Background(), input, func(opts *s3.PresignOptions) {
		opts.Expires = 15 * time.Minute
	})
	if err != nil {
		return "", "", fmt.Errorf("presign upload: %w", err)
	}

	objPublicURL = publicURL + "/" + key
	return result.URL, objPublicURL, nil
}

// BuildStorageKey constructs a deterministic storage key.
// Format: {entity_type}/{entity_id}/{timestamp}_{filename}
func BuildStorageKey(entityType, entityID, filename string) string {
	ts := time.Now().UnixMilli()
	// Sanitize filename
	safe := strings.ReplaceAll(filename, " ", "_")
	safe = strings.ReplaceAll(safe, "..", "_")
	return fmt.Sprintf("%s/%s/%d_%s", entityType, entityID, ts, safe)
}
