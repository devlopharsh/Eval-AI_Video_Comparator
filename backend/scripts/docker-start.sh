#!/bin/sh
set -eu

echo "Waiting for PostgreSQL..."
until node -e "const net=require('net');const socket=net.connect({host: process.env.POSTGRES_HOST || 'postgres', port: Number(process.env.POSTGRES_PORT || 5432)},()=>{socket.end();process.exit(0)});socket.on('error',()=>process.exit(1));" >/dev/null 2>&1
do
  sleep 2
done

echo "Waiting for Redis..."
until node -e "const net=require('net');const socket=net.connect({host: process.env.REDIS_HOST || 'redis', port: Number(process.env.REDIS_PORT || 6379)},()=>{socket.end();process.exit(0)});socket.on('error',()=>process.exit(1));" >/dev/null 2>&1
do
  sleep 2
done

echo "Waiting for Qdrant..."
until node -e "fetch(process.env.QDRANT_URL || 'http://qdrant:6333').then((response)=>process.exit(response.ok ? 0 : 1)).catch(()=>process.exit(1));" >/dev/null 2>&1
do
  sleep 2
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Building backend..."
npm run build

echo "Starting backend..."
node dist/main.js
