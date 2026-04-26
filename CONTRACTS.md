# Local Integration Contracts

This file is the source of truth for local end-to-end integration between frontend, gateway, core-service, worker-service, and infra.

## Ports and Base URLs

- Frontend (`Client`): `http://localhost:3000`
- API Gateway (`api-gateway`): `http://localhost:8080`
- Core Service (`core-service`): `http://localhost:8082`
- Worker Service (`worker-service`): `http://localhost:8083`
- RabbitMQ UI: `http://localhost:15672`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## API Surface (via gateway)

- Register: `POST /auth/register`
- Login: `POST /auth/login`
- Create Job: `POST /api/jobs` — body: `{ jobType, inputText, callbackUrl? }`
- Batch Create: `POST /api/jobs/batch` — body: `{ jobs: [{ jobType, inputText }] }` (max 20)
- Retry Job: `POST /api/jobs/{jobId}/retry` — re-queues a FAILED job
- Job Status: `GET /api/jobs/{jobId}`
- List Jobs: `GET /api/jobs` — Redis hot path (7-day TTL)
- Job History: `GET /api/jobs/history?page=0&size=20&status=&jobType=&from=&to=` — PostgreSQL, paginated
- Delete Job: `DELETE /api/jobs/{jobId}`
- Quota: `GET /api/jobs/quota`
- Profile: `GET /api/user/profile`
- Audit Log: `GET /api/user/audit`
- Core actuator pass-through: `GET /core/actuator/health`, `GET /core/actuator/prometheus`
- Worker actuator pass-through: `GET /worker/actuator/health`, `GET /worker/actuator/prometheus`

## Queue Contract

- Exchange: `ai.jobs`
- Queue: `ai.jobs.new`
- Routing key: `job.new`
- Message format: `<jobId>:<jobType>:<inputText>`
- Supported job types: `summarize`, `classify` (case-insensitive in worker)

## Redis Key Contract

- `job:status:{jobId}`: `CREATED` | `PROCESSING` | `COMPLETED` | `FAILED`
- `job:creator:{jobId}`: request owner email
- `job:result:{jobId}`: final output when completed
- `job:error:{jobId}`: error text when failed
- `job:createdat:{jobId}`: ISO-8601 timestamp
- `job:updatedat:{jobId}`: ISO-8601 timestamp
- `job:type:{jobId}`: job type string
- `job:input:{jobId}`: original inputText (used for retry)
- `job:callback:{jobId}`: webhook URL if provided
- `job:retrycount:{jobId}`: number of retries performed

## PostgreSQL Schema

Table `job_records` — persistent history beyond 7-day Redis TTL:
- `job_id` (PK), `user_email`, `job_type`, `input_text`, `status`, `result`, `error_message`
- `callback_url`, `retry_count`, `created_at`, `updated_at`

## Webhook Contract

If `callbackUrl` is provided at job creation, the worker POSTs this JSON when the job finishes:
```json
{ "jobId": "...", "status": "COMPLETED|FAILED", "result": "...", "errorMessage": null }
```

## Auth Header Contract

- Gateway forwards `Authorization` headers unchanged to core-service.
- Core-service JWT filter expects `Authorization: Bearer <jwt>`.
- Frontend stores `accessToken` and sends it as `Authorization: Bearer <jwt>` for all `/api/jobs` calls.

