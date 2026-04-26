#!/bin/bash

echo "🚀 Starting AI Task Queue Services..."
echo ""

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Start infrastructure if not running
echo "📦 Checking Docker containers..."
cd ai-task-queue
docker compose --env-file ../.env up -d
cd ..

echo ""
echo "🔧 Starting Spring Boot services..."
echo ""
echo "Open these commands in separate terminals:"
echo ""
echo "Terminal 1 (Core Service):"
echo "cd core-service && ./mvnw spring-boot:run"
echo ""
echo "Terminal 2 (Worker Service):"
echo "cd worker-service && ./mvnw spring-boot:run"
echo ""
echo "Terminal 3 (API Gateway):"
echo "cd api-gateway && ./mvnw spring-boot:run"
echo ""
echo "Terminal 4 (Frontend - Optional):"
echo "cd Client && npm run dev"
echo ""
echo "📊 Access points:"
echo "• Frontend: http://localhost:3000"
echo "• API Gateway: http://localhost:8080"
echo "• Grafana: http://localhost:3001 (admin/admin)"
echo "• RabbitMQ UI: http://localhost:15672 (guest/guest)"
echo ""
echo "📝 After starting services, logs will be available in Grafana!"