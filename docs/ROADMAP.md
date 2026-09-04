# 12-Phase Development Roadmap

## Phase 1 - Foundations
Repository setup, architecture, database, auth, workspace/brand profile
Deliverables: docker-compose, .env.example, Prisma schema, auth scaffolding

## Phase 2 - Campaign Planner
Campaign prompt UI + agent planner + structured campaign JSON
Deliverables: Next.js prompt page, Python /agent/plan endpoint, JSON schema validation

## Phase 3 - Content Library & Approval
Content library + approval workflow + calendar
Deliverables: Content list view, approval state machine UI, calendar view

## Phase 4 - Plugin Framework + First Connector
Plugin framework + first official OAuth connector Meta/Instagram
Deliverables: BaseConnector, MetaConnector, OAuth PKCE flow, token encryption

## Phase 5 - Additional Connectors
Facebook, YouTube, LinkedIn connectors + platform validation
Deliverables: Connector stubs, capability checks, publish validation

## Phase 6 - Media Pipeline
Media pipeline + local image/video worker
Deliverables: FFmpeg wrapper, MinIO upload, local generation hooks

## Phase 7 - Queue / Scheduler
Queue/scheduler + retries + idempotency
Deliverables: BullMQ jobs, scheduled_at, exponential backoff, dead-letter

## Phase 8 - Analytics
Analytics normalization + campaign insights
Deliverables: Metrics collector, normalized schema, insights dashboard

## Phase 9 - Security Hardening
Security hardening + audit logs + RBAC
Deliverables: Encryption at rest, RBAC middleware, audit events

## Phase 10 - Docker Deployment
Docker deployment + documentation + E2E tests
Deliverables: Production docker-compose, docs, E2E tests

## Phase 11 - Agent Evaluation
Agent evaluation suite + regression gates
Deliverables: Eval harness, LLM-as-judge tests, regression suite

## Phase 12 - Production Readiness
Production readiness review and connector-by-connector compliance verification
Deliverables: Compliance checklist, security audit, deployment guide
