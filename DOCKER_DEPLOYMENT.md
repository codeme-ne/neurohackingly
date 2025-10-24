# Docker Deployment Guide

Production-ready containerization for neurohackingly.com Astro static blog.

## Overview

**Image Size**: 55.8MB (highly optimized)
**Base**: nginx:alpine + node:20-alpine
**Security**: Non-root user, health checks, security headers
**Build Time**: ~30 seconds

## Quick Start

```bash
# Build production image
docker build -t neurohackingly-blog:latest -f Dockerfile .

# Run container
docker run -d \
  --name neurohackingly-blog \
  -p 8080:8080 \
  neurohackingly-blog:latest

# Verify health
curl http://localhost:8080/health
```

## Files Created

```
blog/
├── Dockerfile              # Production multi-stage build
├── Dockerfile.dev          # Development with hot-reload
├── docker-compose.yml      # Orchestration config
├── .dockerignore          # Build optimization
└── DOCKER_DEPLOYMENT.md   # This file
```

## Architecture

### Multi-Stage Build

**Stage 1: Builder** (node:20-alpine)
- Installs build dependencies (python3, make, g++)
- Runs `npm ci` for reproducible builds
- Executes `astro build` → static files in `/app/dist`

**Stage 2: Runtime** (nginx:alpine)
- Copies built static files
- Custom nginx config with:
  - Gzip compression
  - Security headers (X-Frame-Options, CSP-ready)
  - Health endpoint `/health`
  - Static asset caching (1yr immutable)
- Non-root user `astro:astro` (UID/GID 1001)

## Usage

### Production Deployment

```bash
# Build
docker build -t neurohackingly-blog:production .

# Run with custom port
docker run -d \
  --name blog-prod \
  -p 80:8080 \
  --restart unless-stopped \
  neurohackingly-blog:production

# View logs
docker logs -f blog-prod
```

### Development Mode

```bash
# Start dev server with hot-reload
docker-compose --profile dev up blog-dev

# Access at http://localhost:4321
```

### Docker Compose

```bash
# Production
docker-compose up blog

# Development with hot-reload
docker-compose --profile dev up blog-dev

# Build and run
docker-compose up --build

# Stop all
docker-compose down
```

## Configuration

### Environment Variables

None required for static build. For custom configs:

```bash
docker run -d \
  -e NODE_ENV=production \
  -p 8080:8080 \
  neurohackingly-blog:latest
```

### Nginx Customization

Nginx config is embedded in Dockerfile (heredoc). To modify:

1. Edit Dockerfile at `COPY --chown=astro:astro <<'EOF' /etc/nginx/nginx.conf`
2. Rebuild image: `docker build -t neurohackingly-blog .`

Key settings:
- **Port**: 8080 (non-privileged)
- **Worker processes**: auto
- **Gzip**: enabled for text/css/js/svg
- **Caching**: 1 year for static assets
- **Security headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

### Health Checks

Built-in Docker healthcheck:
- **Interval**: 30s
- **Timeout**: 3s
- **Start period**: 5s
- **Retries**: 3
- **Endpoint**: `GET /health` → "healthy"

## Security Features

### Non-Root User
Container runs as `astro` (UID 1001), not root.

### Minimal Attack Surface
- Alpine Linux base (minimal packages)
- Multi-stage build (no build tools in runtime)
- .dockerignore excludes secrets, node_modules, git

### Security Headers
```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Secrets Management
Never bake secrets into image. Use:
- Docker secrets: `docker secret create`
- Environment variables at runtime
- External secret managers (AWS Secrets Manager, Vault)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Docker Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          cd blog
          docker build -t ghcr.io/${{ github.repository }}:latest .

      - name: Push to registry
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/${{ github.repository }}:latest
```

### Security Scanning

```bash
# Scan for vulnerabilities
docker scan neurohackingly-blog:latest

# Or use Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image neurohackingly-blog:latest
```

## Kubernetes Deployment

### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurohackingly-blog
spec:
  replicas: 3
  selector:
    matchLabels:
      app: blog
  template:
    metadata:
      labels:
        app: blog
    spec:
      containers:
      - name: blog
        image: neurohackingly-blog:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "250m"
        securityContext:
          runAsUser: 1001
          runAsNonRoot: true
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
---
apiVersion: v1
kind: Service
metadata:
  name: blog-service
spec:
  selector:
    app: blog
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

Apply with:
```bash
kubectl apply -f k8s-deployment.yaml
```

## Monitoring & Observability

### Prometheus Metrics

Add nginx-exporter sidecar:

```yaml
# docker-compose.yml addition
  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    command:
      - '-nginx.scrape-uri=http://blog:8080/stub_status'
    ports:
      - "9113:9113"
    depends_on:
      - blog
```

### Logging

View structured logs:
```bash
docker logs -f neurohackingly-blog --tail 100

# JSON logging format
docker logs neurohackingly-blog 2>&1 | jq .
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs neurohackingly-blog

# Inspect container
docker inspect neurohackingly-blog

# Verify image
docker images | grep neurohackingly-blog
```

### Build failures
```bash
# Clear build cache
docker builder prune -a

# Build with no cache
docker build --no-cache -t neurohackingly-blog .

# Check .dockerignore
cat .dockerignore
```

### Health check failing
```bash
# Manual health check
curl http://localhost:8080/health

# Exec into container
docker exec -it neurohackingly-blog sh

# Check nginx status
docker exec neurohackingly-blog ps aux | grep nginx
```

### Port conflicts
```bash
# Find process using port 8080
sudo lsof -i :8080

# Use different port
docker run -p 8081:8080 neurohackingly-blog
```

## Performance Optimization

### Build Cache
Layer ordering optimized:
1. System dependencies
2. package.json (changes rarely)
3. Source code (changes frequently)

### Runtime Performance
- **Gzip compression**: 6x size reduction
- **Static caching**: 1yr for immutable assets
- **Worker processes**: auto (matches CPU cores)

### Image Size Comparison
```
node:20-alpine (builder): 180MB
nginx:alpine (runtime):   45MB
Final image:              55.8MB ✓
```

## Advanced Usage

### Custom Build Args

```dockerfile
# Dockerfile modification
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS builder
```

```bash
# Build with custom Node version
docker build --build-arg NODE_VERSION=22 -t neurohackingly-blog .
```

### Multi-Platform Builds

```bash
# Build for ARM64 + AMD64
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t neurohackingly-blog:multi-arch \
  --push .
```

### Volume Mounts (Development)

```bash
# Mount source for live editing
docker run -d \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/public:/app/public \
  -p 4321:4321 \
  neurohackingly-blog-dev
```

## Best Practices

✅ **DO**:
- Use multi-stage builds for minimal images
- Run as non-root user
- Implement health checks
- Use .dockerignore to reduce build context
- Pin base image versions for reproducibility
- Scan images for vulnerabilities

❌ **DON'T**:
- Hardcode secrets in Dockerfile
- Run as root in production
- Include build tools in runtime image
- Use `latest` tag in production
- Commit .env files or secrets

## Resources

- **Dockerfile**: `blog/Dockerfile`
- **Dev Dockerfile**: `blog/Dockerfile.dev`
- **Compose**: `blog/docker-compose.yml`
- **Ignore rules**: `blog/.dockerignore`

## License

Same as parent project.
