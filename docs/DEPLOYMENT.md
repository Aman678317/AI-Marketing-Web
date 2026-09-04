# Deployment Guide

## Local Development
docker compose up -d postgres redis minio
cp .env.example .env
cd apps/web && npm install && npm run dev

## Production
docker compose -f docker-compose.prod.yml up -d

Env vars required:
POSTGRES_PASSWORD, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD, NEXTAUTH_SECRET, ENCRYPTION_KEY

## E2E Tests
npx playwright install
npx playwright test tests/e2e

## Checklist
- Secrets encrypted at rest
- OAuth tokens stored encrypted
- RBAC enforced
- Audit logs enabled
- Rate limits configured
- Backups for Postgres and MinIO
