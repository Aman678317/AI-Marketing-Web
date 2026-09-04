'use client';
import { useEffect, useState } from 'react';

export default function ContentLibrary() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/campaigns').then(r=>r.json()).then(d=>{
      const contents = d.campaigns?.flatMap((c:any)=>c.content.map((ct:any)=>({...ct, campaignName:c.name}))) || [];
      setItems(contents);
    });
  }, []);

  async function approve(id:string){
    await fetch(`/api/content/${id}/approve`, {method:'POST'});
    setItems(items.map(i=> i.id===id ? {...i, status:'APPROVED'} : i));
  }

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Content Library</h1>
      <table className="w-full border">
        <thead><tr className="border-b"><th className="p-2 text-left">Campaign</th><th className="p-2 text-left">Platform</th><th className="p-2 text-left">Caption</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Action</th></tr></thead>
        <tbody>
          {items.map(i=>(
            <tr key={i.id} className="border-b">
              <td className="p-2">{i.campaignName}</td>
              <td className="p-2">{i.platform}</td>
              <td className="p-2">{i.caption}</td>
              <td className="p-2">{i.status}</td>
              <td className="p-2">
                {i.status==='DRAFT' && <button onClick={()=>approve(i.id)} className="px-2 py-1 bg-blue-500 text-white rounded">Approve</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length===0 && <p className="mt-4 text-gray-500">No content yet. Create a campaign first.</p>}
    </main>
  );
}
