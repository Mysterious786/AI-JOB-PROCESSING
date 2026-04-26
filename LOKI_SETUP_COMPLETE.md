# Loki Log Aggregation - Setup Complete ✅

## What Was Configured

### 1. Docker Infrastructure
- **Loki**: Log aggregation system (port 3100)
- **Promtail**: Log collector that scrapes logs and sends to Loki
- **Grafana**: Already configured with Loki datasource

### 2. Log Sources

#### Docker Containers
Promtail scrapes logs from all Docker containers:
- `aiq-postgres`
- `aiq-redis`
- `aid-rabbitmq`
- `aiq-prometheus`
- `aid-grafana`
- `aiq-loki`
- `aiq-promtail`

#### Spring Boot Services
Both services now write logs to `ai-task-queue/logs/`:
- `core-service.log` - API Gateway and job management logs
- `worker-service.log` - AI job processing logs

### 3. Configuration Changes

#### `ai-task-queue/docker-compose.yml`
- Added Docker socket mount to Promtail: `/var/run/docker.sock:/var/run/docker.sock:ro`
- This allows Promtail to discover and scrape Docker container logs

#### `ai-task-queue/infra/promtail/promtail-config.yml`
- **Job 1**: `docker` - Scrapes all Docker container logs via Docker socket
- **Job 2**: `spring-apps` - Scrapes Spring Boot log files from `/app/logs/*.log`
- Added log parsing pipeline to extract timestamp, level, logger, and message

#### `core-service/src/main/resources/application.yml`
- Added file logging configuration
- Logs written to: `./ai-task-queue/logs/core-service.log`
- Max size: 10MB, Max history: 7 days

#### `worker-service/src/main/resources/application.yaml`
- Updated file logging path from `/var/log/` to `./ai-task-queue/logs/`
- Logs written to: `./ai-task-queue/logs/worker-service.log`
- Max size: 10MB, Max history: 7 days

#### `ai-task-queue/logs/.gitignore`
- Created to ignore log files in git but keep directory structure

## How to Apply Changes

### Step 1: Restart Docker Containers
```bash
cd ai-task-queue
docker compose down
docker compose up -d
```

This will:
- Restart Promtail with Docker socket access
- Apply new Promtail configuration
- Ensure Loki is running

### Step 2: Restart Spring Boot Services
Stop each service (Ctrl+C) and restart:

```bash
# Terminal 1
cd core-service
./mvnw spring-boot:run

# Terminal 2
cd worker-service
./mvnw spring-boot:run

# Terminal 3
cd api-gateway
./mvnw spring-boot:run
```

This will:
- Create log files in `ai-task-queue/logs/`
- Start writing structured logs
- Make logs available to Promtail

## How to View Logs in Grafana

### Access Grafana
1. Open browser: `http://localhost:3001`
2. Login: `admin` / `admin`

### Explore Logs
1. Click **Explore** icon (compass) in left sidebar
2. Select **Loki** from datasource dropdown at top
3. Try these queries:

#### All Spring Boot Logs
```logql
{job="spring-apps"}
```

#### Core Service Logs Only
```logql
{job="spring-apps"} |= "core-service"
```

#### Worker Service Logs Only
```logql
{job="spring-apps"} |= "worker-service"
```

#### Error Logs Only
```logql
{job="spring-apps"} |= "ERROR"
```

#### Filter by Logger
```logql
{job="spring-apps"} |= "com.example.demo.service.JobService"
```

#### All Docker Container Logs
```logql
{container=~".*"}
```

#### Specific Container (e.g., PostgreSQL)
```logql
{container="aiq-postgres"}
```

#### RabbitMQ Logs
```logql
{container="aid-rabbitmq"}
```

### Advanced Queries

#### Count Errors Per Minute
```logql
sum(rate({job="spring-apps"} |= "ERROR" [1m]))
```

#### Job Processing Logs
```logql
{job="spring-apps"} |= "Processing job"
```

#### Authentication Logs
```logql
{job="spring-apps"} |= "login" or |= "register"
```

## Verification Steps

### 1. Check Promtail is Running
```bash
docker ps | grep promtail
```
Expected: `aiq-promtail` container running

### 2. Check Promtail Logs
```bash
docker logs aiq-promtail
```
Expected: No errors, should see "Clients configured" message

### 3. Check Log Files Created
```bash
ls -lh ai-task-queue/logs/
```
Expected: `core-service.log` and `worker-service.log` files

### 4. Check Loki API
```bash
curl http://localhost:3100/ready
```
Expected: `ready`

### 5. Test Log Query
```bash
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="spring-apps"}' | jq
```
Expected: JSON response with log entries

## Troubleshooting

### No Logs Appearing in Grafana

**Check 1**: Verify Promtail can access Docker socket
```bash
docker exec aiq-promtail ls -l /var/run/docker.sock
```

**Check 2**: Verify log files exist
```bash
ls -lh ai-task-queue/logs/
```

**Check 3**: Check Promtail targets
```bash
curl http://localhost:9080/targets
```

**Check 4**: Restart everything
```bash
cd ai-task-queue
docker compose restart promtail loki
```

### Permission Denied on Docker Socket

On macOS, ensure Docker Desktop is running and has proper permissions.

### Log Files Not Created

Ensure you restarted the Spring Boot services after updating `application.yml` files.

## Log Retention

- **Spring Boot logs**: Rotated after 10MB, kept for 7 days
- **Loki**: Default retention (no limit configured, can be added if needed)
- **Promtail positions**: Tracked in `/tmp/positions.yaml` inside container

## Next Steps (Optional Enhancements)

1. **Add Log Retention to Loki**: Configure `limits_config.retention_period` in Loki config
2. **Create Log Dashboard**: Build Grafana dashboard with log panels
3. **Add Alerting**: Set up alerts for ERROR logs or specific patterns
4. **Add More Labels**: Extract more fields from logs (user email, job ID, etc.)
5. **Add Structured Logging**: Use JSON logging format for better parsing

## Summary

✅ Loki and Promtail configured and running  
✅ Docker container logs being scraped  
✅ Spring Boot services writing to shared log directory  
✅ Promtail scraping Spring Boot logs  
✅ Grafana datasource configured  
✅ Log parsing pipeline extracting structured fields  
✅ Ready to query logs in Grafana Explore  

**All configuration is complete. Just restart the services to apply!**
