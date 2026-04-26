# Render Deployment Guide - AI Task Queue

## 🚨 Current Issue: 502 Error Root Cause

Your deployment is failing because:

1. **Redis Connection**: Services try to connect to `localhost:6379` but need to use Render's managed Redis URL
2. **Missing RabbitMQ**: Render doesn't provide managed RabbitMQ, but all services depend on it
3. **Configuration**: Hardcoded localhost values instead of environment variables

## ✅ Solution: Fixed Configuration + CloudAMQP

I've updated the configuration files to use environment variables that work with Render's managed services.

### Step 1: Set Up CloudAMQP (Free RabbitMQ)

1. Go to [CloudAMQP.com](https://www.cloudamqp.com/)
2. Sign up for free account
3. Create a new instance:
   - **Plan**: Little Lemur (Free)
   - **Name**: ai-task-queue-rabbitmq
   - **Region**: Choose closest to your users
4. After creation, go to **Details** tab and note:
   - **Server**: e.g., `jackal.rmq.cloudamqp.com`
   - **User & Vhost**: e.g., `abcdefgh`
   - **Password**: e.g., `xyz123...`

### Step 2: Deploy to Render

1. **Fork/Push Code**: Ensure your updated code is in your Git repository
2. **Deploy via Blueprint**: 
   - Go to [Render Dashboard](https://dashboard.render.com/blueprints)
   - Click "New Blueprint"
   - Connect your repository
   - Select `render.yaml`

3. **Set Environment Variables** (during blueprint setup):

   **Core Service & Worker Service:**
   ```
   RABBITMQ_HOST=jackal.rmq.cloudamqp.com
   RABBITMQ_DEFAULT_USER=abcdefgh
   RABBITMQ_DEFAULT_PASS=xyz123...
   RABBITMQ_VHOST=abcdefgh
   JWT_SECRET=ThisIsAVeryLongSecretKeyForJWTThatIsAtLeast256Bits!ChangeMe
   OPENAI_API_KEY=your-openai-api-key-here
   ```

   **Replace with your actual CloudAMQP values!**

### Step 3: Deploy Frontend to Vercel

1. **Update Frontend Config**:
   ```bash
   cd Client
   # Update .env.local with your Render API Gateway URL
   echo "NEXT_PUBLIC_API_BASE_URL=https://aiq-api-gateway.onrender.com" > .env.local
   ```

2. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **Update render.yaml** with your Vercel URL:
   ```yaml
   - key: FRONTEND_URL
     value: https://your-app.vercel.app  # Replace with actual Vercel URL
   ```

### Step 4: Verify Deployment

1. **Check Service Health**:
   - API Gateway: `https://aiq-api-gateway.onrender.com/actuator/health`
   - Core Service: `https://aiq-core-service.onrender.com/actuator/health`
   - Worker Service: `https://aiq-worker-service.onrender.com/actuator/health`

2. **Test Full Flow**:
   - Open your Vercel frontend URL
   - Register a new account
   - Create a job (any type)
   - Verify it completes successfully

## 🔧 Configuration Changes Made

### Fixed Application Configs:
- **core-service/application.yml**: Added `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_*` env vars
- **worker-service/application.yaml**: Added `REDIS_URL`, `RABBITMQ_*` env vars
- **render.yaml**: Updated with CloudAMQP configuration comments

### Environment Variables Required:
```bash
# Database (auto-injected by Render)
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=...
PGDATABASE=...
PGUSER=...
PGPASSWORD=...

# Redis (auto-injected by Render)
REDIS_URL=redis://...

# RabbitMQ (CloudAMQP - you set these)
RABBITMQ_HOST=jackal.rmq.cloudamqp.com
RABBITMQ_PORT=5672
RABBITMQ_DEFAULT_USER=abcdefgh
RABBITMQ_DEFAULT_PASS=xyz123...
RABBITMQ_VHOST=abcdefgh

# Secrets (you set these)
JWT_SECRET=ThisIsAVeryLongSecretKeyForJWTThatIsAtLeast256Bits!ChangeMe
OPENAI_API_KEY=your-openai-api-key-here

# Frontend URL (update after Vercel deploy)
FRONTEND_URL=https://your-app.vercel.app
```

## 🚀 Alternative: Synchronous Mode (No RabbitMQ)

If you prefer not to use CloudAMQP, I can create a "synchronous mode" where jobs are processed directly without queues. This would work entirely on Render's free tier but with reduced scalability.

Let me know if you want this alternative approach!

## 📋 Troubleshooting

### Common Issues:

1. **Service Won't Start**: Check Render logs for missing environment variables
2. **Database Connection Failed**: Verify `DATABASE_URL` is set correctly
3. **Redis Connection Failed**: Verify `REDIS_URL` is set correctly  
4. **RabbitMQ Connection Failed**: Verify CloudAMQP credentials are correct
5. **CORS Errors**: Update `FRONTEND_URL` in render.yaml after Vercel deployment

### Checking Logs:
- Go to Render Dashboard → Your Service → Logs tab
- Look for connection errors or missing environment variables

## 🎯 Next Steps

1. **Set up CloudAMQP** (5 minutes)
2. **Update environment variables** in Render dashboard
3. **Redeploy services** (automatic after env var changes)
4. **Deploy frontend** to Vercel
5. **Test the complete flow**

Your deployment should work perfectly after these steps!