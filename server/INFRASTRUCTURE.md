# Infrastructure Documentation

## Overview

Infrastructure для системы контроля присутствия на базе BLE-маяков.

## Architecture

```
┌─────────────────┐
│   Internet      │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Nginx  │ (Reverse Proxy + SSL)
    └────┬────┘
         │
    ┌────▼────────────────────────────────────┐
    │  Docker Compose (Production)            │
    │                                         │
    │  ┌─────────┐  ┌─────────┐              │
    │  │ Backend │  │ Web UI  │              │
    │  │  (API)  │  │ (React) │              │
    │  └────┬────┘  └────┬────┘              │
    │       │             │                   │
    │  ┌────▼─────────────▼────┐             │
    │  │   PostgreSQL + Redis  │             │
    │  └───────────────────────┘             │
    │                                         │
    │  ┌──────────────────────────────┐      │
    │  │  Monitoring Stack            │      │
    │  │  - Prometheus (metrics)      │      │
    │  │  - Grafana (dashboards)      │      │
    │  │  - Loki (logs)               │      │
    │  │  - Promtail (log shipper)    │      │
    │  └──────────────────────────────┘      │
    └─────────────────────────────────────────┘
```

## Components

### 1. Backend API (NestJS)
- **Port:** 3000
- **Health Check:** `/health`
- **Metrics:** `/metrics` (Prometheus)
- **Docker Image:** `ghcr.io/{username}/checkin-service:latest`

### 2. PostgreSQL Database
- **Port:** 5432 (localhost only)
- **Version:** 15-alpine
- **Backup:** Daily automated backups
- **Retention:** 7 days + 4 weeks + 6 months

### 3. Redis Cache
- **Port:** 6379 (localhost only)
- **Version:** 7-alpine
- **Usage:** Token blacklist, caching, Bull queue

### 4. Monitoring Stack
- **Prometheus:** Metrics collection (port 9090)
- **Grafana:** Dashboards (port 3001)
- **Loki:** Log aggregation (port 3100)
- **Promtail:** Log shipping

## Deployment

### Prerequisites
- Docker & Docker Compose
- VPS with minimum 4GB RAM, 2 CPU cores
- Domain name with DNS configured
- SSL certificate (Let's Encrypt)

### Setup Steps

1. **Clone repository**
   ```bash
   git clone https://github.com/{username}/checkin-service.git
   cd checkin-service/server
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **Generate JWT keys**
   ```bash
   mkdir -p keys
   openssl genrsa -out keys/private.pem 2048
   openssl rsa -in keys/private.pem -pubout -out keys/public.pem
   ```

4. **Start services**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

5. **Check health**
   ```bash
   docker-compose ps
   curl http://localhost:3000/health
   ```

6. **Access Grafana**
   ```
   http://localhost:3001
   Default credentials: admin/admin
   ```

## Backup & Recovery

### Automated Backups
- **Frequency:** Daily at 2:00 AM
- **Retention:** 7 days + 4 weeks + 6 months
- **Location:** `./backups/`

### Manual Backup
```bash
# Full backup
./backup.sh full

# Schema only
./backup.sh schema

# Data only
./backup.sh data

# List backups
./backup.sh list
```

### Restore
```bash
# Restore from backup file
./backup.sh restore backups/full_backup_20261108_120000.dump
```

## Monitoring

### Health Checks
- **Backend:** `GET /health`
- **PostgreSQL:** `pg_isready`
- **Redis:** `redis-cli ping`

### Metrics
- **Backend:** `GET /metrics` (Prometheus format)
- **PostgreSQL:** postgres-exporter (port 9187)
- **Redis:** redis-exporter (port 9121)

### Logs
- **Backend:** Winston logger → Loki
- **System logs:** Promtail → Loki
- **View in Grafana:** Explore → Loki

### Alerts (TODO)
- High CPU usage (>80%)
- High memory usage (>85%)
- Disk space low (<10%)
- Backend health check failed
- Database connection failed

## Security

### Network Security
- All services bound to `127.0.0.1` (localhost only)
- Nginx reverse proxy for external access
- SSL/TLS encryption (Let's Encrypt)
- Firewall rules (UFW/iptables)

### Application Security
- JWT RS256 signing
- Token blacklist (Redis)
- Rate limiting (60 req/min)
- Device fingerprint binding
- CORS configured

### Database Security
- Strong passwords (env variables)
- No root access
- Encrypted connections (optional)
- Regular backups

## CI/CD Pipeline

### GitHub Actions Workflow
1. **Test:** Lint + Unit tests
2. **Build:** Docker image
3. **Push:** GitHub Container Registry
4. **Deploy:** SSH to VPS + docker-compose pull

### Branches
- `master` → Production deployment
- `develop` → Staging (optional)
- PR → Run tests only

## Troubleshooting

### Backend not starting
```bash
# Check logs
docker-compose logs backend

# Check health
curl http://localhost:3000/health

# Restart service
docker-compose restart backend
```

### Database connection failed
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify connection
docker exec -it checkin_postgres psql -U postgres -c "SELECT 1"
```

### Redis connection failed
```bash
# Check Redis status
docker-compose ps redis

# Check logs
docker-compose logs redis

# Test connection
docker exec -it checkin_redis redis-cli ping
```

### High memory usage
```bash
# Check container stats
docker stats

# Restart services with memory limits
docker-compose -f docker-compose.production.yml up -d --force-recreate
```

## Maintenance

### Update Services
```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d

# Remove old images
docker image prune -f
```

### Database Migration
```bash
# Run migrations
docker exec -it checkin_backend npm run migration:run

# Revert migration
docker exec -it checkin_backend npm run migration:revert
```

### Log Rotation
- Prometheus: 30 days retention
- Loki: Configurable (default: 168h)
- Backup files: 7 days + 4 weeks + 6 months

## Performance Tuning

### PostgreSQL
```sql
-- Increase connection limit
ALTER SYSTEM SET max_connections = 200;

-- Increase memory
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '1536MB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Redis
```bash
# Increase max memory
CONFIG SET maxmemory 512mb
CONFIG SET maxmemory-policy allkeys-lru
```

### Backend
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096"
```

## Cost Estimation (VPS)

### Minimum (Oracle Cloud Free Tier)
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 50 GB
- **Cost:** $0/month (free tier)

### Recommended (Timeweb/Selectel)
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Storage:** 100 GB SSD
- **Cost:** ~$20-30/month

### High Load
- **CPU:** 8 cores
- **RAM:** 16 GB
- **Storage:** 200 GB SSD
- **Cost:** ~$50-70/month

## Contact & Support

- **Documentation:** `docs/` folder
- **Issues:** GitHub Issues
- **Monitoring:** Grafana dashboards
- **Logs:** Loki (via Grafana)
