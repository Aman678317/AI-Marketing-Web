-- Workspace and Brand seed for local dev
INSERT INTO "Workspace" (id, name, slug, "createdAt") VALUES ('ws_demo', 'Demo Workspace', 'demo-workspace', NOW()) ON CONFLICT DO NOTHING;
INSERT INTO "Brand" (id, name, "workspaceId", website, niche, tone, "createdAt") VALUES ('brand_demo', 'Demo Brand', 'ws_demo', 'https://example.com', 'SaaS', 'Professional', NOW()) ON CONFLICT DO NOTHING;
