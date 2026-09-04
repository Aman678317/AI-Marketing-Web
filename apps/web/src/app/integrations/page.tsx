'use client';
import { useEffect, useState } from 'react';

const connectors = [
  { id: 'meta', name: 'Meta / Instagram', platform: 'meta', path: '/api/auth/meta/start' },
  { id: 'facebook', name: 'Facebook', platform: 'facebook', path: '/api/auth/facebook/start' },
  { id: 'youtube', name: 'YouTube', platform: 'youtube', path: '/api/auth/youtube/start' },
  { id: 'linkedin', name: 'LinkedIn', platform: 'linkedin', path: '/api/auth/linkedin/start' },
];

export default function Integrations() {
  const [connections, setConnections] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/connections').then(r=>r.json()).then(setConnections).catch(()=>setConnections([]));
  }, []);

  const isConnected = (platform:string) => connections.some(c=>c.platform===platform);

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Integrations</h1>
      <div className="space-y-3">
        {connectors.map(c => {
          const conn = connections.find(x=>x.platform===c.platform);
          return (
            <div key={c.id} className="border rounded p-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-500">{isConnected(c.platform) ? `Connected as ${conn?.displayName}` : 'Not connected'}</div>
                  {conn && (
                    <div className="text-xs mt-1">Capabilities: {Object.entries(conn.capabilities||{}).filter(([,v])=>v).map(([k])=>k).join(', ')}</div>
                  )}
                </div>
                <button onClick={()=>window.location.href=c.path} className="px-3 py-1 bg-black text-white rounded">
                  {isConnected(c.platform) ? 'Reconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
