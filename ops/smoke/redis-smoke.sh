#!/usr/bin/env bash
set -euo pipefail

IMAGE=${REDIS_IMAGE:-redis:8.2.2}
CONTAINER_NAME="weapp-redis-smoke"

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

docker run -d --name "$CONTAINER_NAME" -p 6379:6379 "$IMAGE"

echo "Waiting for Redis to be ready..."
for i in {1..60}; do
  if docker exec "$CONTAINER_NAME" redis-cli ping >/dev/null 2>&1; then
    echo "Redis ready"
    break
  fi
  sleep 1
done

echo "Running smoke commands..."
docker exec "$CONTAINER_NAME" redis-cli set smoke_key 1 || true
docker exec "$CONTAINER_NAME" redis-cli get smoke_key || true

echo "Cleaning up"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "redis-smoke completed"