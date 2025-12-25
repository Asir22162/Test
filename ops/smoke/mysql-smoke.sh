#!/usr/bin/env bash
set -euo pipefail

# Start a MySQL container and run a simple smoke test
IMAGE=${MYSQL_IMAGE:-mysql:8.4}
ROOT_PASS=${MYSQL_ROOT_PASSWORD:-root}
DB=${MYSQL_DATABASE:-test}
CONTAINER_NAME="weapp-mysql-smoke"

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

docker run -d --name "$CONTAINER_NAME" -e MYSQL_ROOT_PASSWORD="$ROOT_PASS" -e MYSQL_DATABASE="$DB" -p 3306:3306 --health-cmd='mysqladmin ping --silent' --health-interval=10s --health-timeout=5s --health-retries=5 "$IMAGE"

echo "Waiting for MySQL to become healthy..."
for i in {1..60}; do
  if docker exec "$CONTAINER_NAME" mysql -uroot -p"$ROOT_PASS" -e "SELECT 1" >/dev/null 2>&1; then
    echo "MySQL ready"
    break
  fi
  sleep 1
done

echo "Running smoke queries..."
docker exec "$CONTAINER_NAME" mysql -uroot -p"$ROOT_PASS" -e "CREATE TABLE IF NOT EXISTS smoke_test (id INT PRIMARY KEY); INSERT IGNORE INTO smoke_test (id) VALUES (1); SELECT * FROM smoke_test;" || true

echo "Logs from container:"
docker logs "$CONTAINER_NAME" --tail 200

echo "Cleaning up"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "mysql-smoke completed"