# Logging Architecture

## Overview

Complete log aggregation setup using Loki, Promtail, and Grafana for the AI Task Queue system.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOG SOURCES                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Core Service    │  │  Worker Service  │  │  API Gateway     │  │
│  │  (Port 8082)     │  │  (Port 8083)     │  │  (Port 8080)     │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │             │
│           │ Writes logs         │ Writes logs         │ Writes logs │
│           ▼                     ▼                     ▼             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │         ai-task-queue/logs/                                  │   │
│  │  • core-service.log                                          │   │
│  │  • worker-service.log                                        │   │
│  │  (10MB max, 7 day rotation)                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Docker Containers (via Docker socket)                       │   │
│  │  • aiq-postgres                                              │   │
│  │  • aiq-redis                                                 │   │
│  │  • aid-rabbitmq                                              │   │
│  │  • aiq-prometheus                                            │   │
│  │  • aid-grafana                                               │   │
│  │  • aiq-loki                                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Scrapes logs
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PROMTAIL                                     │
│                    (Port 9080, Container)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Job 1: Docker Logs                                                  │
│  • Discovers containers via /var/run/docker.sock                    │
│  • Extracts container name and stream labels                        │
│                                                                       │
│  Job 2: Spring Boot Logs                                             │
│  • Reads from /app/logs/*.log                                        │
│  • Parses log format:                                                │
│    YYYY-MM-DD HH:mm:ss.SSS [thread] LEVEL logger - message          │
│  • Extracts: timestamp, level, logger, message                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Pushes logs
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           LOKI                                       │
│                    (Port 3100, Container)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  • Stores logs with labels                                           │
│  • Indexes: job, container, level, logger, stream                   │
│  • Queryable via LogQL                                               │
│  • No retention limit (configurable)                                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Queries logs
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GRAFANA                                      │
│                  (Port 3001, Container)                              │
│                    Login: admin/admin                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Datasources:                                                        │
│  • Prometheus (metrics) - http://prometheus:9090                    │
│  • Loki (logs) - http://loki:3100                                   │
│                                                                       │
│  Dashboards:                                                         │
│  • AI Job Queue Dashboard (metrics)                                 │
│                                                                       │
│  Explore:                                                            │
│  • Query logs with LogQL                                             │
│  • Filter by job, container, level, logger                          │
│  • Live tail for real-time logs                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Log Flow

### 1. Log Generation
- **Spring Boot Services**: Write structured logs to files
  - Format: `YYYY-MM-DD HH:mm:ss.SSS [thread] LEVEL logger - message`
  - Location: `ai-task-queue/logs/*.log`
  - Rotation: 10MB max, 7 day history

- **Docker Containers**: Write to stdout/stderr
  - Captured by Docker daemon
  - Accessible via Docker socket

### 2. Log Collection (Promtail)
- **Scrapes** log files and Docker containers
- **Parses** log format to extract structured fields
- **Labels** logs with metadata (job, container, level, logger)
- **Pushes** to Loki via HTTP API

### 3. Log Storage (Loki)
- **Indexes** logs by labels (not full-text)
- **Stores** log content separately
- **Compresses** data for efficient storage
- **Serves** queries via HTTP API

### 4. Log Visualization (Grafana)
- **Queries** Loki using LogQL
- **Displays** logs in Explore view
- **Filters** by labels and content
- **Streams** live logs
- **Exports** to CSV/JSON

## Label Structure

### Spring Boot Logs
```
{
  job="spring-apps",
  level="INFO|DEBUG|WARN|ERROR",
  logger="com.example.demo.service.JobService",
  filename="core-service.log"
}
```

### Docker Container Logs
```
{
  job="docker",
  container="aiq-postgres",
  stream="stdout|stderr"
}
```

## Query Examples

### By Service
```logql
{job="spring-apps"} |= "core-service"
{job="spring-apps"} |= "worker-service"
```

### By Level
```logql
{job="spring-apps", level="ERROR"}
{job="spring-apps"} |~ "ERROR|WARN"
```

### By Logger
```logql
{job="spring-apps", logger="com.example.demo.service.JobService"}
```

### By Container
```logql
{container="aiq-postgres"}
{container="aid-rabbitmq"}
```

### Combined
```logql
{job="spring-apps"} |= "JobService" |= "ERROR"
```

## Performance Characteristics

### Promtail
- **CPU**: Low (~1-5%)
- **Memory**: ~50-100MB
- **Disk I/O**: Minimal (reads log files)
- **Network**: Depends on log volume

### Loki
- **CPU**: Low (~5-10%)
- **Memory**: ~100-200MB (depends on query load)
- **Disk**: Grows with log volume (compresses well)
- **Network**: Minimal

### Impact on Services
- **Zero impact**: Services write to files asynchronously
- **No code changes**: Standard logging configuration
- **No performance overhead**: Promtail reads files independently

## Retention Strategy

### Spring Boot Log Files
- **Max size**: 10MB per file
- **Max history**: 7 days
- **Auto-rotation**: Yes
- **Compression**: Yes (older files)

### Loki Storage
- **Default**: No retention limit
- **Configurable**: Can set retention period
- **Recommendation**: 30 days for production

### Promtail Positions
- **Tracks**: Last read position per file
- **Location**: `/tmp/positions.yaml` (in container)
- **Persistence**: Lost on container restart (re-reads from start)

## Monitoring the Monitoring

### Check Promtail Health
```bash
curl http://localhost:9080/ready
curl http://localhost:9080/targets
```

### Check Loki Health
```bash
curl http://localhost:3100/ready
curl http://localhost:3100/metrics
```

### Check Log Ingestion
```bash
# Count logs in last 5 minutes
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query=sum(count_over_time({job="spring-apps"}[5m]))'
```

## Troubleshooting

### No Logs in Grafana

1. **Check Promtail is running**
   ```bash
   docker ps | grep promtail
   ```

2. **Check Promtail logs**
   ```bash
   docker logs aiq-promtail
   ```

3. **Check log files exist**
   ```bash
   ls -lh ai-task-queue/logs/
   ```

4. **Check Loki is receiving logs**
   ```bash
   curl http://localhost:3100/loki/api/v1/label/job/values
   ```

5. **Restart services**
   ```bash
   cd ai-task-queue
   docker compose restart promtail loki
   ```

### Logs Not Being Written

1. **Check Spring Boot service is running**
2. **Check log file permissions**
3. **Check disk space**
4. **Restart Spring Boot services**

### High Disk Usage

1. **Check log file sizes**
   ```bash
   du -sh ai-task-queue/logs/
   ```

2. **Reduce retention**
   - Update `max-history` in `application.yml`

3. **Add Loki retention**
   - Configure `limits_config.retention_period` in Loki config

## Security Considerations

### Docker Socket Access
- Promtail has **read-only** access to Docker socket
- Required for container log discovery
- No write permissions

### Log Content
- Logs may contain sensitive data
- **Do not log**: passwords, tokens, API keys
- **Mask sensitive fields** in application code

### Network Exposure
- Loki: Internal only (port 3100)
- Promtail: Internal only (port 9080)
- Grafana: Exposed (port 3001) - use strong password

## Future Enhancements

1. **Structured Logging**: Use JSON format for better parsing
2. **Log Retention**: Configure Loki retention policy
3. **Alerting**: Set up alerts for ERROR logs
4. **Dashboards**: Create log-based dashboards
5. **Correlation**: Link logs to traces (distributed tracing)
6. **Multi-tenancy**: Separate logs by environment/tenant
