# AI Marketing Automation Agent - Claude Project Context

## Project
Local-first AI-powered marketing control center for multi-platform content planning, generation, approval, scheduling and analytics.

## Skills
Project-local Claude Skills in .claude/skills/:

Engineering:
- agent-designer
- agent-workflow-designer
- senior-backend
- senior-fullstack
- senior-architect
- agent-harness
- agentic-evaluation-framework
- ai-security
- secrets-vault-manager
- ci-cd-pipeline-builder
- cloud-security

Marketing:
- social-content
- social-media-manager
- social-media-analyzer
- content-creator
- content-strategy
- marketing-ops
- marketing-context
- campaign-analytics
- brand-guidelines

## Architecture
See docs/ARCHITECTURE.md

## Roadmap
See docs/ROADMAP.md - 12 phases from spec

## Commands
docker compose up -d postgres redis minio
cd apps/web && npm run dev
docker compose up worker

## Guidelines
- Human approval before publishing
- Official APIs only, no scraping
- Encrypt OAuth secrets at rest
- Local-first, no compulsory paid AI API
- Typed tools and validation around AI outputs
