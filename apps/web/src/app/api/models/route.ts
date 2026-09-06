import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ModelInfo = { id: string; detail?: string };
type Provider = { id: string; name: string; status: 'connected' | 'unavailable'; note?: string; models: ModelInfo[] };

const LOCAL_SUGGESTIONS: ModelInfo[] = [
  { id: 'llama3.1:8b', detail: 'Good general default — install via `ollama pull llama3.1:8b`' },
  { id: 'qwen2.5:7b', detail: 'Strong multilingual/copywriting — `ollama pull qwen2.5:7b`' },
  { id: 'mistral:7b', detail: 'Fast, lightweight — `ollama pull mistral:7b`' },
];

async function fetchOpenAI(): Promise<Provider> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      id: 'openai',
      name: 'OpenAI (optional)',
      status: 'unavailable',
      note: 'Set OPENAI_API_KEY in .env to enable. The app stays fully functional without it.',
      models: [],
    };
  }
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok || !data?.data) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    const models: ModelInfo[] = data.data
      .map((m: any) => ({ id: m.id, detail: m.owned_by ? `owned_by: ${m.owned_by}` : undefined }))
      .sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id));
    return { id: 'openai', name: 'OpenAI (optional)', status: 'connected', models };
  } catch (err: any) {
    return {
      id: 'openai',
      name: 'OpenAI (optional)',
      status: 'unavailable',
      note: err?.message || 'Could not reach the OpenAI API.',
      models: [],
    };
  }
}

// Optional OpenAI-compatible gateway (Experiential Labs by default).
// Mirrors the worker's planner chain: Ollama first, cloud gateway second, heuristic fallback last.
async function fetchOpenAICompat(): Promise<Provider> {
  const key = process.env.EXPLABS_API_KEY;
  const base = process.env.EXPLABS_BASE_URL || 'https://api.experientiallabs.ai/v1';
  const configuredModel = process.env.EXPLABS_MODEL || 'gpt-4o-mini';
  if (!key) {
    return {
      id: 'explabs',
      name: 'Experiential Labs (optional cloud)',
      status: 'unavailable',
      note: 'Set EXPLABS_API_KEY in .env to enable. Local Ollama and the heuristic planner keep the app fully functional without it.',
      models: [],
    };
  }
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok || !data?.data) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    const models: ModelInfo[] = data.data
      .map((m: any) => ({ id: m.id, detail: m.owned_by ? `owned_by: ${m.owned_by}` : undefined }))
      .sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id));
    return {
      id: 'explabs',
      name: 'Experiential Labs (optional cloud)',
      status: 'connected',
      note: `Planner uses "${configuredModel}" via ${base} when local Ollama is unavailable. Override with EXPLABS_MODEL.`,
      models,
    };
  } catch (err: any) {
    return {
      id: 'explabs',
      name: 'Experiential Labs (optional cloud)',
      status: 'unavailable',
      note: err?.message || 'Could not reach the gateway.',
      models: [],
    };
  }
}

async function fetchOllama(): Promise<Provider> {
  const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(4000) });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok || !data?.models) throw new Error(`HTTP ${res.status}`);
    const models: ModelInfo[] = data.models.map((m: any) => ({
      id: m.name,
      detail: [m.details?.parameter_size, m.details?.quantization_level].filter(Boolean).join(' · ') || undefined,
    }));
    return { id: 'ollama', name: 'Ollama (local)', status: 'connected', models };
  } catch {
    return {
      id: 'ollama',
      name: 'Ollama (local)',
      status: 'unavailable',
      note: `No local runtime found at ${base}. Install Ollama and pull a model to enable local generation.`,
      models: LOCAL_SUGGESTIONS,
    };
  }
}

export async function GET() {
  const [ollama, explabs, openai] = await Promise.all([fetchOllama(), fetchOpenAICompat(), fetchOpenAI()]);
  return NextResponse.json({
    providers: [ollama, explabs, openai],
    principle:
      'Local-first: no paid API key is required for core development. Cloud gateways are optional adapters; the planner prefers local Ollama, falls back to the gateway, then to deterministic heuristics.',
  });
}
