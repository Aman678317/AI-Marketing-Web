
## Run
cp .env.example .env
docker compose up -d postgres redis minio
cd apps/web && npm install && npm run dev

## Deploy
See docs/DEPLOYMENT.md
