# Grafana Loki Query Cheat Sheet

Quick reference for common log queries in Grafana Explore.

## Access
- URL: `http://localhost:3001`
- Login: `admin` / `admin`
- Navigate to: **Explore** → Select **Loki** datasource

---

## Basic Queries

### All Application Logs
```logql
{job="spring-apps"}
```

### Core Service Only
```logql
{job="spring-apps"} |= "core-service"
```

### Worker Service Only
```logql
{job="spring-apps"} |= "worker-service"
```

---

## Filter by Log Level

### Errors Only
```logql
{job="spring-apps"} |= "ERROR"
```

### Warnings and Errors
```logql
{job="spring-apps"} |~ "ERROR|WARN"
```

### Debug Logs
```logql
{job="spring-apps"} |= "DEBUG"
```

---

## Filter by Component

### Authentication Logs
```logql
{job="spring-apps"} |= "AuthService"
```

### Job Processing Logs
```logql
{job="spring-apps"} |= "JobService"
```

### AI Processor Logs
```logql
{job="spring-apps"} |~ "SummarizeProcessor|ClassifyProcessor|TranslateProcessor"
```

### RabbitMQ Consumer Logs
```logql
{job="spring-apps"} |= "JobConsumer"
```

---

## Search by Content

### Login Events
```logql
{job="spring-apps"} |= "login"
```

### Job Creation
```logql
{job="spring-apps"} |= "Creating job"
```

### Job Completion
```logql
{job="spring-apps"} |= "completed successfully"
```

### Failed Jobs
```logql
{job="spring-apps"} |= "failed"
```

### Rate Limit Hits
```logql
{job="spring-apps"} |= "rate limit"
```

---

## Docker Container Logs

### All Containers
```logql
{container=~".*"}
```

### PostgreSQL
```logql
{container="aiq-postgres"}
```

### Redis
```logql
{container="aiq-redis"}
```

### RabbitMQ
```logql
{container="aid-rabbitmq"}
```

---

## Advanced Queries

### Error Rate (per minute)
```logql
sum(rate({job="spring-apps"} |= "ERROR" [1m]))
```

### Count Logs by Level
```logql
sum by (level) (count_over_time({job="spring-apps"} [5m]))
```

### Top 10 Loggers
```logql
topk(10, sum by (logger) (count_over_time({job="spring-apps"} [1h])))
```

### Logs from Last 5 Minutes
```logql
{job="spring-apps"} [5m]
```

---

## Combining Filters

### Core Service Errors
```logql
{job="spring-apps"} |= "core-service" |= "ERROR"
```

### Worker Service Job Processing
```logql
{job="spring-apps"} |= "worker-service" |= "Processing job"
```

### Authentication Failures
```logql
{job="spring-apps"} |= "AuthService" |= "failed"
```

---

## Time Range

Use the time picker in top-right corner:
- Last 5 minutes
- Last 15 minutes
- Last 1 hour
- Last 24 hours
- Custom range

---

## Tips

1. **Use `|=` for contains**: `{job="spring-apps"} |= "ERROR"`
2. **Use `|~` for regex**: `{job="spring-apps"} |~ "ERROR|WARN"`
3. **Use `!=` to exclude**: `{job="spring-apps"} != "DEBUG"`
4. **Chain filters**: `{job="spring-apps"} |= "JobService" |= "ERROR"`
5. **Click on log lines** to see full details and extracted fields
6. **Use Live tail** button for real-time streaming logs

---

## Common Use Cases

### Debugging a Failed Job
```logql
{job="spring-apps"} |= "job" |= "failed"
```

### Monitoring Authentication
```logql
{job="spring-apps"} |~ "login|register|token"
```

### Tracking AI Processing
```logql
{job="spring-apps"} |~ "Processor" |= "Processing"
```

### Database Connection Issues
```logql
{job="spring-apps"} |= "postgres" |= "ERROR"
```

### RabbitMQ Issues
```logql
{job="spring-apps"} |= "rabbitmq" |= "ERROR"
```

---

## Export Logs

1. Run your query
2. Click **Inspector** button (top right)
3. Go to **Data** tab
4. Click **Download CSV** or **Download JSON**
