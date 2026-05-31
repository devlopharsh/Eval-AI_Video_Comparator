#!/bin/sh
set -eu

resolve_host_port() {
  node -e "
    const target = process.argv[1];
    const fallbackHost = process.argv[2];
    const fallbackPort = process.argv[3];

    try {
      if (!target) {
        console.log(\`\${fallbackHost} \${fallbackPort}\`);
        process.exit(0);
      }

      if (target.includes('://')) {
        const url = new URL(target);
        console.log(\`\${url.hostname} \${url.port || fallbackPort}\`);
        process.exit(0);
      }

      console.log(\`\${target} \${fallbackPort}\`);
    } catch {
      console.log(\`\${fallbackHost} \${fallbackPort}\`);
    }
  " "$1" "$2" "$3"
}

DB_TARGET="$(resolve_host_port "${DATABASE_URL:-}" "postgres" "5432")"
DB_HOST="$(echo "$DB_TARGET" | cut -d' ' -f1)"
DB_PORT="$(echo "$DB_TARGET" | cut -d' ' -f2)"

REDIS_TARGET="$(resolve_host_port "${REDIS_HOST:-}" "redis" "${REDIS_PORT:-6379}")"
REDIS_HOST_RESOLVED="$(echo "$REDIS_TARGET" | cut -d' ' -f1)"
REDIS_PORT_RESOLVED="$(echo "$REDIS_TARGET" | cut -d' ' -f2)"

QDRANT_TARGET="${QDRANT_URL:-http://qdrant:6333}"

echo "Waiting for PostgreSQL..."
until node -e "const net=require('net');const socket=net.connect({host: process.argv[1], port: Number(process.argv[2])},()=>{socket.end();process.exit(0)});socket.on('error',()=>process.exit(1));" "$DB_HOST" "$DB_PORT" >/dev/null 2>&1
do
  sleep 2
done

echo "Waiting for Redis..."
until node -e "const net=require('net');const socket=net.connect({host: process.argv[1], port: Number(process.argv[2])},()=>{socket.end();process.exit(0)});socket.on('error',()=>process.exit(1));" "$REDIS_HOST_RESOLVED" "$REDIS_PORT_RESOLVED" >/dev/null 2>&1
do
  sleep 2
done

echo "Waiting for Qdrant..."
until node -e "fetch(process.argv[1]).then((response)=>process.exit(response.ok ? 0 : 1)).catch(()=>process.exit(1));" "$QDRANT_TARGET" >/dev/null 2>&1
do
  sleep 2
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Building backend..."
npm run build

echo "Starting backend..."
node dist/main.js
