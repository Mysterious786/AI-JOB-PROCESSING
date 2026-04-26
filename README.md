# 🤖 AI Task Queue — Async AI Job Processing Platform

> A production-grade, microservices-based AI job processing system. Submit text, get back AI-powered results — asynchronously, reliably, at scale.

**🌐 Live Demo:** https://jobp-two.vercel.app
**📦 GitHub:** https://github.com/Mysterious786/AI-JOB-PROCESSING

---

## 📸 App Preview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Task Queue                    👤  [20/20] │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│  ┌─────────────────────────────┐   ┌───────────────────────────┐   │
│  │  📝 Create New Job          │   │  📊 Job Queue             │   │
│  │─────────────────────────────│   │───────────────────────────│   │
│  │  Job Type: [Summarize  ▼]   │   │  ✅ Summarize  COMPLETED  │   │
│  │                             │   │  ⏳ Classify   PROCESSING │   │
│  │  Input Text:                │   │  ✅ Translate  COMPLETED  │   │
│  │  ┌─────────────────────┐    │   │  ❌ Sentiment  FAILED     │   │
│  │  │ Enter your text...  │    │   │  ✅ Keywords   COMPLETED  │   │
│  │  │                     │    │   │  ⏳ Q&A        QUEUED     │   │
│  │  └─────────────────────┘    │   │                           │   │
│  │                             │   │  [Load More...]           │   │
│  │  Priority: [Medium     ▼]   │   └───────────────────────────┘   │
│  │                             │                                   │
│  │  [  Submit Job  ]           │   ┌───────────────────────────┐   │
│  └─────────────────────────────┘   │  📈 Quota Usage           │   │
│                                    │  ████████░░  16/20 jobs   │   │
│                                    │  Resets in 44 minutes     │   │
│                                    └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│  Job Result Card — Summarize                          COMPLETED ✅  │
│─────────────────────────────────────────────────────────────────────│
│  Input: "Artificial intelligence is transforming industries..."     │
│                                                                     │
│  ▼ AI Result                                          [📋 Copy]    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  • AI is reshaping healthcare, finance, and education       │   │
│  │  • Machine learning enables predictive analytics            │   │
│  │  • Automation reduces operational costs by up to 40%        │   │
│  │  • Ethical concerns around bias and transparency remain     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Medium Priority  •  Apr 26, 2026  •  ID: ff46ce86  [🗑 Delete]   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

```
                              ┌─────────────────┐
                              │   Next.js        │
                              │   Frontend       │
                              │   (Vercel)       │
                              └────────┬────────┘
                                       │ HTTPS
                                       ▼
                         ┌─────────────────────────┐
                         │      API Gateway         │
                         │   Spring Boot :8080      │
                         │   • Reverse Proxy        │
                         │   • CORS Handling        │
                         │   • Request Routing      │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
       ┌────────────────────────┐           ┌────────────────────────┐
       │     Core Service       │           │    Worker Service       │
       │  Spring Boot :8082     │           │  Spring Boot :8083      │
       │  • JWT Auth            │           │  • RabbitMQ Consumer   │
       │  • Job Management      │           │  • OpenAI Integration  │
       │  • Rate Limiting       │           │  • AI Processing       │
       │  • Audit Logging       │           │  • Result Storage      │
       └────────────────────────┘           └────────────────────────┘
                    │                                     │
         ┌──────────┼──────────┐                         │
         │          │          │                         │
         ▼          ▼          ▼                         ▼
   ┌──────────┐ ┌───────┐ ┌────────┐            ┌──────────────┐
   │PostgreSQL│ │ Redis │ │Rabbit  │◄───────────►│  CloudAMQP   │
   │(Users)   │ │(Jobs) │ │  MQ    │             │  (Managed)   │
   └──────────┘ └───────┘ └────────┘            └──────────────┘
```

---

## 🔄 Job Processing Flow

```
  User                Frontend           API Gateway        Core Service
   │                     │                    │                  │
   │──── Submit Job ─────►│                   │                  │
   │                     │──── POST /api/jobs ►│                  │
   │                     │                    │──── Proxy ───────►│
   │                     │                    │                  │──── Validate JWT
   │                     │                    │                  │──── Check Rate Limit (Redis)
   │                     │                    │                  │──── Save to PostgreSQL
   │                     │                    │                  │──── Publish to RabbitMQ
   │                     │                    │                  │──── Store status in Redis
   │                     │◄─── jobId ─────────┤◄─── jobId ───────┤
   │◄──── jobId ─────────│                    │                  │
   │                     │                    │                  │
   │                     │                    │            Worker Service
   │                     │                    │                  │
   │                     │                    │         ┌────────┘
   │                     │                    │         │ Consume from RabbitMQ
   │                     │                    │         │ Call OpenAI API
   │                     │                    │         │ Store result in Redis
   │                     │                    │         │ Update status → COMPLETED
   │                     │                    │         └────────┐
   │                     │                    │                  │
   │                     │──── Poll status ───►│                  │
   │                     │                    │──── GET /api/jobs/{id} ►│
   │                     │                    │                  │──── Read from Redis
   │◄──── Show Result ───│◄─── result ────────┤◄─── result ──────┤
```

---

## 🤖 AI Job Types

| Job Type | Input | AI Output |
|----------|-------|-----------|
| **Summarize** | Any text | Bullet-point summary |
| **Classify** | Any text | Category + reason (support/sales/billing/technical) |
| **Translate** | Text in any language | Detected language + English translation |
| **Sentiment** | Any text | Sentiment label + score + confidence + summary |
| **Keywords** | Any text | 5-8 extracted key phrases as tags |
| **Q&A** | Question + context | Direct answer from context |

---

## ⚙️ Tech Stack

### Backend
| Service | Technology | Port |
|---------|-----------|------|
| API Gateway | Spring Boot 3.5, Java 17 | 8080 |
| Core Service | Spring Boot 3.5, Spring Security, JPA | 8082 |
| Worker Service | Spring Boot 3.5, Spring AI, Spring AMQP | 8083 |

### Data Layer
| Store | Purpose | Technology |
|-------|---------|-----------|
| PostgreSQL | User accounts | Render Managed Postgres |
| Redis | Job state, rate limits, audit logs | Render Managed Key-Value |
| RabbitMQ | Async job queue | CloudAMQP (managed) |

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 14 | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| GSAP | Animations |
| Vercel | Hosting |

### Observability
| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection |
| Grafana | Dashboards & visualization |
| Loki | Log aggregation |
| Promtail | Log shipping |

---

## 🏭 Production Features

### Rate Limiting
```
Redis Key: ratelimit:jobs:{email}
Window:    1 hour (sliding)
Limit:     20 jobs/hour per user
Behavior:  Fail open if Redis unavailable
```

### Dead Letter Queue + Retry
```
Main Queue:  ai.jobs.new
DLQ:         ai.jobs.dlq
Retries:     3 attempts
Backoff:     2s → 4s → 8s (exponential)
After DLQ:   Job marked FAILED in Redis
```

### JWT Token Lifecycle
```
Access Token:   15 minutes
Refresh Token:  7 days
Auto-Renewal:   60 seconds before expiry
Storage:        sessionStorage (client-side)
```

### Job TTL
```
All Redis keys: 7-day expiry
Prevents:       Memory bloat on free tier
```

### Audit Logging
```
Redis Key:  audit:{email}
Events:     REGISTER, LOGIN, JOB_CREATED, JOB_DELETED
Retention:  Last 100 events, 30-day TTL
Access:     Profile modal in dashboard
```

---

## 📊 Grafana Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  AI Job Queue Dashboard                    Last 1h  [Auto 10s ↻]   │
│─────────────────────────────────────────────────────────────────────│
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Jobs/min     │  │ Success Rate │  │ Error Rate   │             │
│  │    4.2       │  │   98.3%      │  │    1.7%      │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  Processing Duration (percentiles)                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  p50 ──────────────────────────── 1.2s                      │   │
│  │  p95 ──────────────────────────────────────── 3.8s          │   │
│  │  p99 ──────────────────────────────────────────────── 6.1s  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Service Health                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ API Gateway  │  │ Core Service │  │Worker Service│             │
│  │    🟢 UP     │  │    🟢 UP     │  │    🟢 UP     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Local Development

### Prerequisites
- Java 17+
- Node.js 18+
- Docker Desktop

### 1. Start Infrastructure
```bash
cd ai-task-queue
docker compose up -d
```

Services started:
- PostgreSQL → `localhost:5433`
- Redis → `localhost:6379`
- RabbitMQ → `localhost:5672` (UI: `localhost:15672`)
- Prometheus → `localhost:9090`
- Grafana → `localhost:3001` (admin/admin)

### 2. Start Backend Services
```bash
# Terminal 1
cd core-service && ./mvnw spring-boot:run

# Terminal 2
cd worker-service && ./mvnw spring-boot:run

# Terminal 3
cd api-gateway && ./mvnw spring-boot:run
```

### 3. Start Frontend
```bash
cd Client
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`

---

## 🌍 Production Deployment

### Architecture
```
  Vercel (Frontend)
       │
       ▼
  Render.com
  ├── aiq-api-gateway   (Docker)
  ├── aiq-core-service  (Docker)
  ├── aiq-worker-service (Docker)
  ├── aiq-postgres      (Managed Postgres)
  └── aiq-redis         (Managed Key-Value)
       │
       ▼
  CloudAMQP (Managed RabbitMQ)
```

### Environment Variables

**Core Service:**
```env
SPRING_PROFILES_ACTIVE=prod
PGHOST=<render-postgres-host>
PGPORT=5432
PGDATABASE=ai_task_queue
PGUSER=admin
PGPASSWORD=<password>
REDIS_URL=redis://<render-redis-host>:6379
RABBITMQ_HOST=<cloudamqp-host>
RABBITMQ_DEFAULT_USER=<user>
RABBITMQ_DEFAULT_PASS=<password>
RABBITMQ_VHOST=<vhost>
JWT_SECRET=<min-256-bit-secret>
OPENAI_API_KEY=<your-key>
```

**Worker Service:**
```env
SPRING_PROFILES_ACTIVE=prod
REDIS_URL=redis://<render-redis-host>:6379
RABBITMQ_HOST=<cloudamqp-host>
RABBITMQ_DEFAULT_USER=<user>
RABBITMQ_DEFAULT_PASS=<password>
RABBITMQ_VHOST=<vhost>
OPENAI_API_KEY=<your-key>
```

**Frontend (Vercel):**
```env
NEXT_PUBLIC_API_BASE_URL=https://aiq-api-gateway.onrender.com
```

---

## 📁 Project Structure

```
AI-JOB-PROCESSING/
├── api-gateway/                    # Spring Boot reverse proxy
│   └── src/main/java/
│       ├── config/
│       │   ├── GatewayConfig.java  # CORS + RestTemplate
│       │   └── UpstreamProperties.java
│       └── controller/
│           └── CoreProxyController.java
│
├── core-service/                   # Main business logic
│   └── src/main/java/
│       ├── config/                 # Security, Redis config
│       ├── controller/             # Auth, Jobs, User endpoints
│       ├── service/                # AuthService, JobService,
│       │                           # RateLimitService, AuditService
│       ├── entity/                 # UserEntity, JobRecord
│       ├── repository/             # JPA repositories
│       ├── security/               # JWT provider + filter
│       └── dto/                    # Request/Response DTOs
│
├── worker-service/                 # AI job processor
│   └── src/main/java/
│       ├── config/                 # RabbitMQ, Redis config
│       ├── consumer/               # JobConsumer, DeadLetterConsumer
│       └── processor/              # SummarizeProcessor
│                                   # ClassifyProcessor
│                                   # TranslateProcessor
│                                   # SentimentProcessor
│                                   # KeywordsProcessor
│                                   # QAProcessor
│
├── Client/                         # Next.js frontend
│   ├── app/
│   │   ├── page.tsx                # Login/Register
│   │   └── dashboard/page.tsx      # Main dashboard
│   ├── components/
│   │   ├── JobForm.tsx             # Job submission form
│   │   ├── JobStatusCard.tsx       # Job result display
│   │   └── ...
│   └── lib/
│       ├── api.ts                  # API client
│       └── session.ts              # Auth session management
│
└── ai-task-queue/                  # Docker Compose infra
    ├── docker-compose.yml
    └── infra/
        ├── grafana/                # Dashboard JSON
        ├── prometheus/             # Scrape config
        └── promtail/               # Log shipping config
```

---

## 🔌 API Reference

### Auth
```
POST /auth/register    { email, password }  → { accessToken, refreshToken, expiresIn }
POST /auth/login       { email, password }  → { accessToken, refreshToken, expiresIn }
POST /auth/refresh     { refreshToken }     → { accessToken, refreshToken, expiresIn }
```

### Jobs
```
POST   /api/jobs              Create job       → { jobId, status }
GET    /api/jobs              List all jobs    → JobStatusResponse[]
GET    /api/jobs/{id}         Get job status   → JobStatusResponse
DELETE /api/jobs/{id}         Delete job       → 204
POST   /api/jobs/{id}/retry   Retry failed job → { jobId, status }
GET    /api/jobs/quota        Get rate limit   → { used, limit, remaining }
```

### User
```
GET /api/user/profile   → { email, totalJobs, quotaUsed, quotaLimit }
GET /api/user/audit     → string[] (audit log entries)
```

---

## 🧪 Quick Smoke Test

```bash
# Register
curl -X POST https://aiq-api-gateway.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Pass@123"}'

# Login
TOKEN=$(curl -s -X POST https://aiq-api-gateway.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Pass@123"}' | jq -r .accessToken)

# Create a summarize job
curl -X POST https://aiq-api-gateway.onrender.com/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobType":"summarize","inputText":"Artificial intelligence is transforming every industry."}'

# Check quota
curl https://aiq-api-gateway.onrender.com/api/jobs/quota \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 License

MIT — free to use, modify, and deploy.

---

<div align="center">
  Built with ☕ Java, 🐇 RabbitMQ, 🔴 Redis, 🤖 OpenAI, and ⚡ Next.js
</div>
