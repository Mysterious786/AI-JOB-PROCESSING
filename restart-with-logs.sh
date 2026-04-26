#!/bin/bash

# Script to restart infrastructure with Loki log aggregation
# This ensures all services are properly configured for log collection

set -e

echo "🔄 Restarting AI Task Queue Infrastructure with Loki..."
echo ""

# Step 1: Restart Docker containers
echo "📦 Step 1: Restarting Docker containers..."
cd ai-task-queue
docker compose down
echo "   ⏳ Starting containers..."
docker compose up -d
cd ..

# Wait for containers to be healthy
echo "   ⏳ Waiting for containers to be ready..."
sleep 5

# Check container status
echo "   ✅ Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep "aiq-\|aid-"

echo ""
echo "📊 Infrastructure endpoints:"
echo "   • Grafana: http://localhost:3001 (admin/admin)"
echo "   • Prometheus: http://localhost:9090"
echo "   • Loki: http://localhost:3100"
echo "   • RabbitMQ UI: http://localhost:15672 (guest/guest)"
echo ""

# Step 2: Check log directory
echo "📁 Step 2: Checking log directory..."
if [ ! -d "ai-task-queue/logs" ]; then
    echo "   ⚠️  Creating logs directory..."
    mkdir -p ai-task-queue/logs
fi
echo "   ✅ Log directory ready: ai-task-queue/logs/"
echo ""

# Step 3: Instructions for Spring Boot services
echo "🚀 Step 3: Restart Spring Boot services"
echo ""
echo "   Open 3 separate terminals and run:"
echo ""
echo "   Terminal 1 (Core Service):"
echo "   $ cd core-service && ./mvnw spring-boot:run"
echo ""
echo "   Terminal 2 (Worker Service):"
echo "   $ cd worker-service && ./mvnw spring-boot:run"
echo ""
echo "   Terminal 3 (API Gateway):"
echo "   $ cd api-gateway && ./mvnw spring-boot:run"
echo ""

# Step 4: Verification steps
echo "✅ Step 4: Verify log collection (after starting services)"
echo ""
echo "   1. Check log files are being created:"
echo "      $ ls -lh ai-task-queue/logs/"
echo ""
echo "   2. Check Promtail is scraping logs:"
echo "      $ curl http://localhost:9080/targets"
echo ""
echo "   3. Check Loki is receiving logs:"
echo "      $ curl http://localhost:3100/ready"
echo ""
echo "   4. View logs in Grafana:"
echo "      • Open http://localhost:3001"
echo "      • Go to Explore → Select Loki"
echo "      • Query: {job=\"spring-apps\"}"
echo ""

echo "📚 Documentation:"
echo "   • Setup guide: LOKI_SETUP_COMPLETE.md"
echo "   • Query examples: ai-task-queue/GRAFANA_LOG_QUERIES.md"
echo "   • Architecture: LOGGING_ARCHITECTURE.md"
echo "   • Runbook: RUNBOOK.md"
echo ""

echo "✨ Infrastructure restart complete!"
echo "   Now restart your Spring Boot services to enable log collection."
