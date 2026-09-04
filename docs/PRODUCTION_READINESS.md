# Production Readiness Checklist

## Security
- [ ] OAuth secrets encrypted at rest
- [ ] RBAC enforced on all API routes
- [ ] Audit logs immutable
- [ ] Security headers present
- [ ] Rate limiting enabled

## Reliability
- [ ] Queue retries with exponential backoff
- [ ] Idempotency keys for publish jobs
- [ ] Dead-letter handling
- [ ] Database backups configured
- [ ] Health checks for all services

## Compliance
- [ ] Official APIs used, no scraping
- [ ] Terms of service reviewed per platform
- [ ] Human approval gate enforced
- [ ] Data retention policy defined

## Observability
- [ ] Logging centralized
- [ ] Metrics dashboard
- [ ] Alerts for failures

## Deployment
- [ ] Docker Compose prod tested
- [ ] Environment variables documented
- [ ] CI/CD pipeline passing
- [ ] E2E tests green
- [ ] Agent evals pass threshold
