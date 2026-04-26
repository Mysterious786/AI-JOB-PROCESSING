#!/bin/bash

# Script to verify Loki logging setup
# Run this after starting all services

echo "🔍 Verifying Loki Logging Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# 1. Check Docker containers
echo "📦 Checking Docker containers..."
docker ps | grep -q "aiq-loki"
check "Loki container running"

docker ps | grep -q "aiq-promtail"
check "Promtail container running"

docker ps | grep -q "aid-grafana"
check "Grafana container running"

echo ""

# 2. Check Loki health
echo "🔍 Checking Loki health..."
curl -s http://localhost:3100/ready > /dev/null 2>&1
check "Loki is ready"

echo ""

# 3. Check Promtail health
echo "🔍 Checking Promtail health..."
curl -s http://localhost:9080/ready > /dev/null 2>&1
check "Promtail is ready"

echo ""

# 4. Check log directory
echo "📁 Checking log directory..."
if [ -d "ai-task-queue/logs" ]; then
    echo -e "${GREEN}✅ Log directory exists${NC}"
    
    if [ -f "ai-task-queue/logs/core-service.log" ]; then
        SIZE=$(du -h ai-task-queue/logs/core-service.log | cut -f1)
        echo -e "${GREEN}✅ core-service.log exists (${SIZE})${NC}"
    else
        echo -e "${YELLOW}⚠️  core-service.log not found (service may not be running)${NC}"
    fi
    
    if [ -f "ai-task-queue/logs/worker-service.log" ]; then
        SIZE=$(du -h ai-task-queue/logs/worker-service.log | cut -f1)
        echo -e "${GREEN}✅ worker-service.log exists (${SIZE})${NC}"
    else
        echo -e "${YELLOW}⚠️  worker-service.log not found (service may not be running)${NC}"
    fi
else
    echo -e "${RED}❌ Log directory not found${NC}"
fi

echo ""

# 5. Check Loki labels
echo "🏷️  Checking Loki labels..."
LABELS=$(curl -s http://localhost:3100/loki/api/v1/label/job/values 2>/dev/null | grep -o '"spring-apps"')
if [ ! -z "$LABELS" ]; then
    echo -e "${GREEN}✅ Spring apps logs are being ingested${NC}"
else
    echo -e "${YELLOW}⚠️  No spring-apps logs found yet (services may need time to generate logs)${NC}"
fi

echo ""

# 6. Check Grafana datasource
echo "📊 Checking Grafana..."
curl -s http://localhost:3001/api/health > /dev/null 2>&1
check "Grafana is accessible"

echo ""

# 7. Test log query
echo "🔎 Testing log query..."
QUERY_RESULT=$(curl -s -G "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="spring-apps"}' \
  --data-urlencode 'limit=1' 2>/dev/null)

if echo "$QUERY_RESULT" | grep -q '"status":"success"'; then
    LOG_COUNT=$(echo "$QUERY_RESULT" | grep -o '"result":\[.*\]' | grep -o '\[.*\]' | wc -c)
    if [ $LOG_COUNT -gt 10 ]; then
        echo -e "${GREEN}✅ Successfully queried logs from Loki${NC}"
    else
        echo -e "${YELLOW}⚠️  Loki is working but no logs found yet${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not query logs (services may need time to generate logs)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Summary
echo "📋 Summary:"
echo ""
echo "   Infrastructure: http://localhost:3001 (Grafana)"
echo "   Loki API: http://localhost:3100"
echo "   Promtail: http://localhost:9080"
echo ""
echo "   To view logs in Grafana:"
echo "   1. Open http://localhost:3001"
echo "   2. Login: admin/admin"
echo "   3. Go to Explore → Select Loki"
echo "   4. Query: {job=\"spring-apps\"}"
echo ""
echo "   Documentation:"
echo "   • LOKI_SETUP_COMPLETE.md"
echo "   • ai-task-queue/GRAFANA_LOG_QUERIES.md"
echo "   • LOGGING_ARCHITECTURE.md"
echo ""
