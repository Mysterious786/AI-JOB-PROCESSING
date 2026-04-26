# Full Stack Local Runbook

## 1) Start Infrastructure

From `ai-task-queue`:

```bash
docker compose up -d
```

Infra endpoints:

- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- RabbitMQ AMQP: `localhost:5672`
- RabbitMQ UI: `http://localhost:15672`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin)

Default local credentials (from `.env`):

- Postgres: `admin` / `adminpassword`
- RabbitMQ: `guest` / `guest`
- Grafana: `admin` / `admin`

## 2) Start Backend Services

In separate terminals:

```bash
cd core-service && ./mvnw spring-boot:run
cd worker-service && ./mvnw spring-boot:run
cd api-gateway && ./mvnw spring-boot:run
```

Health checks:

- Gateway: `http://localhost:8080/actuator/health`
- Core: `http://localhost:8082/actuator/health`
- Worker: `http://localhost:8083/actuator/health`
- Core via gateway pass-through: `http://localhost:8080/core/actuator/health`
- Worker via gateway pass-through: `http://localhost:8080/worker/actuator/health`

## 3) Start Frontend

From `Client`:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4) Smoke Test User Flow

1. Register from frontend.
2. Login.
3. Create a job from dashboard (any of 6 types: summarize, classify, translate, sentiment, keywords, qa).
4. Wait for status polling to show `completed`.
5. Confirm result text appears on the job card.
6. Click the profile button (👤) to view quota and audit log.

## 5) New Features

### Rate Limiting
- Max 20 jobs per hour per user (configurable in `application.yml`)
- Quota shown in header bar and profile modal
- Enforced at job creation time

### Auto Token Refresh
- Access token auto-renews 60s before expiry
- No more forced logouts mid-session

### Dead Letter Queue + Retry
- Jobs retry 3 times with exponential backoff (2s, 4s, 8s)
- After exhaustion, moved to `ai.jobs.dlq` queue
- DLQ consumer marks job as FAILED in Redis

### Job TTL
- All Redis keys expire after 7 days
- Prevents memory bloat

### Audit Logging
- Every action (register, login, job created, job deleted) logged
- View in profile modal
- Stored in Redis per user (last 100 events, 30-day TTL)

### Grafana Dashboard
- Pre-configured dashboard at `http://localhost:3001`
- Shows: jobs/min, success rate, error rate, p50/p95/p99 latency, service health

## 6) API Smoke Test (curl)

Register:

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Pass@123"}'
```

Login:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Pass@123"}' | jq -r .accessToken)
```

Create job:

```bash
curl -X POST http://localhost:8080/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobType":"summarize","inputText":"hello queue"}'
```

Get quota:

```bash
curl -X GET http://localhost:8080/api/jobs/quota \
  -H "Authorization: Bearer $TOKEN"
```

Get profile:

```bash
curl -X GET http://localhost:8080/api/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

Get audit log:

```bash
curl -X GET http://localhost:8080/api/user/audit \
  -H "Authorization: Bearer $TOKEN"
```

## 7) Observability Checks

### Prometheus
- Prometheus targets page: `http://localhost:9090/targets`
  - Ensure `core-service`, `worker-service`, and `api-gateway` are `UP`.

### Grafana
- Grafana login: `http://localhost:3001` (admin/admin)
  - Dashboard: "AI Job Queue Dashboard"
  - Panels: jobs/min, success rate, latency percentiles, error rate, service health

### Loki Log Aggregation
- **Setup**: Loki and Promtail are configured in docker-compose.yml
- **Log Sources**:
  - Docker containers (postgres, redis, rabbitmq, etc.)
  - Spring Boot services (core-service, worker-service)
- **Log Files**: Services write to `ai-task-queue/logs/`
  - `core-service.log`
  - `worker-service.log`

**To view logs in Grafana**:
1. Go to `http://localhost:3001`
2. Navigate to **Explore** (compass icon in left sidebar)
3. Select **Loki** datasource from dropdown
4. Try these queries:
   - All logs: `{job="spring-apps"}`
   - Core service only: `{job="spring-apps"} |= "core-service"`
   - Worker service only: `{job="spring-apps"} |= "worker-service"`
   - Error logs: `{job="spring-apps"} |= "ERROR"`
   - Docker containers: `{container=~".*"}`
   - Specific container: `{container="aiq-postgres"}`

**Restart services to apply log configuration**:
```bash
# Stop services (Ctrl+C in each terminal)
# Then restart:
cd core-service && ./mvnw spring-boot:run
cd worker-service && ./mvnw spring-boot:run
```

**Restart Docker containers to apply Promtail changes**:
```bash
cd ai-task-queue
docker compose down
docker compose up -d
```

## 8) Queue Checks

RabbitMQ UI (`http://localhost:15672`) -> `Queues and Streams`:

- Main queue: `ai.jobs.new` (with priority support, max priority 10)
- Dead letter queue: `ai.jobs.dlq` (receives jobs after 3 failed retries)
- Publish from app and observe:
  - `Ready` briefly increases
  - `Unacked`/`Total` changes while worker consumes

## 9) Automated Test

From `core-service`:

```bash
./mvnw test
```

Expected:

- `DemoApplicationTests.fullFlow_register_login_createJob_statusCompletes` passes.

