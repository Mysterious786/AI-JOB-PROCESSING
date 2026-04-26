# Quick Start: Loki Log Aggregation

Complete setup in 3 steps to enable log aggregation for your AI Task Queue system.

## Prerequisites

- Docker Desktop running
- All services stopped (core-service, worker-service, api-gateway)

## Step 1: Restart Infrastructure (2 minutes)

```bash
cd ai-task-queue
docker compose down
docker compose up -d
cd ..
```

**What this does:**
- Starts Loki (log storage)
- Starts Promtail (log collector) with Docker socket access
- Starts Grafana with Loki datasource configured

**Verify:**
```bash
docker ps | grep -E "loki|promtail|grafana"
```

You should see 3 containers running.

## Step 2: Restart Spring Boot Services (3 minutes)

Open 3 separate terminals:

**Terminal 1 - Core Service:**
```bash
cd core-service
./mvnw spring-boot:run
```

**Terminal 2 - Worker Service:**
```bash
cd worker-service
./mvnw spring-boot:run
```

**Terminal 3 - API Gateway:**
```bash
cd api-gateway
./mvnw spring-boot:run
```

**What this does:**
- Services now write logs to `ai-task-queue/logs/`
- Promtail automatically scrapes these log files
- Logs are sent to Loki for storage

**Verify:**
```bash
ls -lh ai-task-queue/logs/
```

You should see `core-service.log` and `worker-service.log`.

## Step 3: View Logs in Grafana (1 minute)

1. **Open Grafana:** http://localhost:3001
2. **Login:** `admin` / `admin`
3. **Navigate:** Click **Explore** (compass icon) in left sidebar
4. **Select datasource:** Choose **Loki** from dropdown
5. **Query logs:** Enter `{job="spring-apps"}` and click **Run query**

**You should see logs from both services!**

## Quick Test

Generate some logs by using the application:

1. Open frontend: http://localhost:3000
2. Register/login
3. Create a job
4. Go back to Grafana and refresh the query

You'll see authentication logs, job creation logs, and processing logs!

## Common Queries

Copy-paste these into Grafana Explore:

### All application logs
```logql
{job="spring-apps"}
```

### Only errors
```logql
{job="spring-apps"} |= "ERROR"
```

### Core service logs
```logql
{job="spring-apps"} |= "core-service"
```

### Worker service logs
```logql
{job="spring-apps"} |= "worker-service"
```

### Job processing logs
```logql
{job="spring-apps"} |= "Processing job"
```

### Authentication logs
```logql
{job="spring-apps"} |= "AuthService"
```

## Troubleshooting

### No logs appearing?

**Check 1:** Are services running?
```bash
curl http://localhost:8082/actuator/health  # core-service
curl http://localhost:8083/actuator/health  # worker-service
```

**Check 2:** Are log files being created?
```bash
ls -lh ai-task-queue/logs/
tail -f ai-task-queue/logs/core-service.log
```

**Check 3:** Is Promtail scraping logs?
```bash
curl http://localhost:9080/targets
```

**Check 4:** Is Loki receiving logs?
```bash
curl http://localhost:3100/loki/api/v1/label/job/values
```

Should return: `{"status":"success","data":["spring-apps","docker"]}`

**Still not working?** Restart everything:
```bash
cd ai-task-queue
docker compose restart promtail loki
cd ..
# Then restart Spring Boot services (Ctrl+C and restart)
```

## What's Configured

### Log Sources
- ✅ Core Service → `ai-task-queue/logs/core-service.log`
- ✅ Worker Service → `ai-task-queue/logs/worker-service.log`
- ✅ Docker containers (postgres, redis, rabbitmq, etc.)

### Log Collection
- ✅ Promtail scrapes log files every 5 seconds
- ✅ Promtail scrapes Docker container logs
- ✅ Logs parsed to extract: timestamp, level, logger, message

### Log Storage
- ✅ Loki stores logs with labels
- ✅ Indexed by: job, container, level, logger
- ✅ Queryable via LogQL

### Log Visualization
- ✅ Grafana Explore for ad-hoc queries
- ✅ Live tail for real-time logs
- ✅ Export to CSV/JSON

## Next Steps

### 1. Explore More Queries
See `ai-task-queue/GRAFANA_LOG_QUERIES.md` for 30+ example queries.

### 2. Create a Log Dashboard
1. In Grafana, go to **Dashboards** → **New** → **New Dashboard**
2. Add panels with log queries
3. Save dashboard

### 3. Set Up Alerts
1. In Grafana, go to **Alerting** → **Alert rules**
2. Create alert for ERROR logs
3. Configure notification channel (email, Slack, etc.)

### 4. Add More Labels
Edit `ai-task-queue/infra/promtail/promtail-config.yml` to extract more fields from logs.

## Documentation

- **Complete Setup Guide:** `LOKI_SETUP_COMPLETE.md`
- **Query Examples:** `ai-task-queue/GRAFANA_LOG_QUERIES.md`
- **Architecture Diagram:** `LOGGING_ARCHITECTURE.md`
- **Full Runbook:** `RUNBOOK.md`

## Automated Scripts

### Restart Everything
```bash
./restart-with-logs.sh
```

### Verify Setup
```bash
./verify-logging-setup.sh
```

## Support

If you encounter issues:

1. Check Docker Desktop is running
2. Check all containers are healthy: `docker ps`
3. Check service health endpoints
4. Review Promtail logs: `docker logs aiq-promtail`
5. Review Loki logs: `docker logs aiq-loki`

## Summary

✅ **Infrastructure:** Loki + Promtail + Grafana running in Docker  
✅ **Services:** Writing logs to shared directory  
✅ **Collection:** Promtail scraping logs every 5 seconds  
✅ **Storage:** Loki storing logs with labels  
✅ **Visualization:** Grafana Explore ready for queries  

**You're all set! Start exploring your logs in Grafana.**
