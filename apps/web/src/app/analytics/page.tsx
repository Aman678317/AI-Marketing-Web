'use client';
import { useEffect, useState } from 'react';

export default function Analytics() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/analytics').then(r=>r.json()).then(d=>setData(d.analytics||[]));
  }, []);
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>
      <table className="w-full border text-sm">
        <thead><tr className="border-b"><th className="p-2 text-left">Content</th><th className="p-2 text-left">Platform</th><th className="p-2 text-left">Impressions</th><th className="p-2 text-left">Reach</th><th className="p-2 text-left">Likes</th><th className="p-2 text-left">Clicks</th></tr></thead>
        <tbody>
          {data.map((a:any)=>(
            <tr key={a.id} className="border-b">
              <td className="p-2">{a.contentId}</td>
              <td className="p-2">{a.platform}</td>
              <td className="p-2">{a.impressions}</td>
              <td className="p-2">{a.reach}</td>
              <td className="p-2">{a.likes}</td>
              <td className="p-2">{a.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
