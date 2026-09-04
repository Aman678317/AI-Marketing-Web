# Architecture

## High-Level Layers

Web UI -> API / Backend -> Agent Orchestrator -> Plugin System -> Media Pipeline -> Scheduler / Queue -> Database -> Object Storage -> Local AI Worker

## Web UI
Next.js + React + TypeScript
Dashboard, campaign builder, calendar, content library, approvals, integrations, analytics, settings

## API / Backend
Node.js/TypeScript
Auth, workspaces, campaigns, content, scheduling, connector orchestration, permissions

## Agent Orchestrator
Python FastAPI
Supervisor agent with deterministic tools
Roles: Marketing Strategist, Content Planner, Creative Director, Platform Adapter, Publisher, Analytics Analyst, Compliance/Safety Gate
Execution loop: Intent -> Plan -> Tool selection -> Draft -> Validate -> Human approval -> Schedule -> Publish -> Collect metrics -> Learn/optimize

## Plugin System
Connector marketplace with capability declaration
OAuth 2.0 PKCE, encrypted token storage, capability discovery
Connectors: Meta/Instagram, Facebook, YouTube, LinkedIn, X, GitHub

## Media Pipeline
FFmpeg for transcoding, thumbnails, metadata
Local image/video generation via ComfyUI / local diffusion
MinIO for asset storage

## Scheduler / Queue
Redis + BullMQ
Durable jobs with idempotency keys, exponential backoff, rate limiting, dead-letter handling

## Database
PostgreSQL production, SQLite local demo
Models: User, Workspace, WorkspaceMember, Brand, Connection, Campaign, Content, Job

## Security
Encrypt OAuth credentials at rest
Short-lived sessions, secure cookies, RBAC
CSRF protection, rate limiting, audit events
Validate uploads, never execute shell commands from model output

## Local-First
Docker Compose one-command local operation
No compulsory paid AI API for core development
Graceful degradation when platform API unavailable
