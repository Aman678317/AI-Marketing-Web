'use client';
import { useState } from 'react';

export default function Home() {
  const [brief, setBrief] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });

      // Read as text first — the body may be empty or non-JSON on server errors.
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Server returned a non-JSON response (HTTP ${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Request failed with HTTP ${res.status}.`);
      }
      if (!data) {
        throw new Error('Server returned an empty response.');
      }

      setPlan(data);
    } catch (err: any) {
      // Network failures land here too (fetch rejects with TypeError).
      setError(err?.message || 'Something went wrong while generating the plan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">AI Marketing Automation Agent</h1>
      <p className="mb-6">Enter a campaign brief and generate a structured multi-day plan.</p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <textarea
          value={brief}
          onChange={e => setBrief(e.target.value)}
          placeholder="For the next 10 days, promote my website example.com. Create one short video and one image post per day for Instagram, Facebook, YouTube, and LinkedIn. Tone professional, target startup founders."
          className="w-full h-32 p-3 border rounded"
          required
        />
        <button disabled={loading} className="px-4 py-2 bg-black text-white rounded disabled:opacity-50">
          {loading ? 'Planning...' : 'Generate Plan'}
        </button>
      </form>

      {error && (
        <div role="alert" className="mb-6 border border-red-300 bg-red-50 text-red-800 rounded p-4 text-sm">
          <strong>Could not generate the plan:</strong> {error}
        </div>
      )}

      {plan && (
        <div className="border rounded p-4 bg-gray-50 space-y-4">
          {plan.note && <p className="text-sm text-amber-700">{plan.note}</p>}
          <h2 className="text-xl font-semibold">Campaign Plan</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>ID:</strong> {plan.campaign_id}</div>
            <div><strong>Status:</strong> {plan.status}</div>
            <div><strong>Objective:</strong> {plan.objective}</div>
            <div><strong>Audience:</strong> {plan.audience}</div>
            <div><strong>Platforms:</strong> {plan.platforms?.join(', ')}</div>
            <div><strong>Duration:</strong> {plan.duration_days} days</div>
            <div><strong>Saved to DB:</strong> {plan.saved ? `yes (${plan.contentCount} content items)` : 'no (DB not set up)'}</div>
          </div>
          <div>
            <h3 className="font-semibold mt-4 mb-2">Daily Assets</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {plan.daily_assets?.slice(0,5).map((d:any, i:number) => (
                <li key={i}>Day {d.day}: {d.assets?.map((a:any)=>a.type).join(' + ')} for {d.assets?.[0]?.platforms?.join(', ')}</li>
              ))}
              {(!plan.daily_assets || plan.daily_assets.length === 0) && <li>No daily assets in this plan.</li>}
              {plan.daily_assets && plan.daily_assets.length > 5 && <li>... and {plan.daily_assets.length -5} more days</li>}
            </ul>
          </div>
          <details>
            <summary className="cursor-pointer text-sm">Raw JSON</summary>
            <pre className="text-xs overflow-auto mt-2 p-2 bg-white border rounded">{JSON.stringify(plan, null, 2)}</pre>
          </details>
        </div>
      )}
    </main>
  );
}
