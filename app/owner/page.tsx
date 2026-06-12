'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, Plus, Pencil, Link as LinkIcon, Settings, ShieldCheck, Clipboard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function OwnerPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    admin_password: '',
    attendance_methods: { telegram: true, gps: true, qr: true, face: true, fingerprint: true }
  });

  const fetchOrgs = async () => {
    setLoading(true);
    const { data } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (data) setOrgs(data);
    setLoading(false);
  };

  const checkAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const stored = localStorage.getItem('owner_auth');
    if (stored === 'true' || password) {
      try {
        const res = await fetch('/api/owner/verify', { method: 'POST', body: JSON.stringify({ password: password || localStorage.getItem('owner_stored_pwd') }) });
        if (res.ok) {
           setIsAuthenticated(true);
           if (password) {
              localStorage.setItem('owner_auth', 'true');
              localStorage.setItem('owner_stored_pwd', password);
           }
           fetchOrgs();
        } else {
           if (e) alert('Incorrect password');
           localStorage.removeItem('owner_auth');
        }
      } catch (err) {}
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForm = (org?: any) => {
    if (org) {
       setEditingId(org.id);
       setFormData({
         slug: org.slug,
         name: org.name,
         admin_password: org.admin_password,
         attendance_methods: org.attendance_methods || { telegram: true, gps: true, qr: true, face: true, fingerprint: true }
       });
    } else {
       setEditingId('');
       setFormData({ slug: '', name: '', admin_password: '', attendance_methods: { telegram: true, gps: true, qr: true, face: true, fingerprint: true } });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await supabase.from('organizations').update({
        slug: formData.slug, name: formData.name, admin_password: formData.admin_password, attendance_methods: formData.attendance_methods
      }).eq('id', editingId);
    } else {
      await supabase.from('organizations').insert({
        slug: formData.slug, name: formData.name, admin_password: formData.admin_password, attendance_methods: formData.attendance_methods
      });
    }
    setIsModalOpen(false);
    fetchOrgs();
  };

  const toggleMethod = (method: 'telegram'|'gps'|'qr'|'face'|'fingerprint') => {
    setFormData(prev => ({
      ...prev,
      attendance_methods: {
        ...prev.attendance_methods,
        [method]: !prev.attendance_methods[method]
      }
    }));
  };

  const copyLink = (path: string, slug: string) => {
    const url = window.location.origin + path + '?org=' + slug;
    navigator.clipboard.writeText(url);
    alert('Copied: ' + url);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={checkAuth} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Owner Access</h1>
          <input 
            type="password" 
            placeholder="System Owner Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 mb-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-800 outline-none"
          />
          <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2">
            <LogIn className="w-5 h-5" /> Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
               <ShieldCheck className="w-8 h-8 text-indigo-600" /> Multi-Tenant Owner Panel
            </h1>
            <p className="text-slate-500 mt-2">Manage all registered organizations (tenants).</p>
          </div>
          <button onClick={() => openForm()} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
            <Plus className="w-5 h-5" /> New Organization
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgs.map((org) => (
             <div key={org.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h2 className="text-xl font-bold text-slate-800">{org.name}</h2>
                   <p className="text-sm font-mono text-slate-500">Slug: {org.slug}</p>
                 </div>
                 <button onClick={() => openForm(org)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Pencil className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="space-y-3 mb-6">
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Methods enabled:
                   <span className="font-semibold text-slate-800">
                      {Object.keys(org.attendance_methods || {}).filter(k => (org.attendance_methods as any)[k]).length}
                   </span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                   <ShieldCheck className="w-4 h-4 text-slate-400" /> Admin Pass: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{org.admin_password}</span>
                 </div>
               </div>

               <div className="flex gap-2">
                 <button onClick={() => copyLink('/', org.slug)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-200">
                    <Clipboard className="w-4 h-4" /> App LInk
                 </button>
                 <button onClick={() => copyLink('/admin', org.slug)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 text-indigo-700 rounded-xl text-sm font-medium transition-colors border border-slate-200">
                    <LinkIcon className="w-4 h-4" /> Admin
                 </button>
               </div>
             </div>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6">
             <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Organization' : 'New Organization'}</h2>
             
             <form onSubmit={handleSave} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-1">Organization Name</label>
                 <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full px-3 py-2 border rounded-xl" />
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1">Unique Slug (URL alias)</label>
                 <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} required disabled={!!editingId && formData.slug === 'default'} className="w-full px-3 py-2 border rounded-xl" />
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1">Admin Dashboard Password</label>
                 <input type="text" value={formData.admin_password} onChange={e => setFormData({...formData, admin_password: e.target.value})} required className="w-full px-3 py-2 border rounded-xl" />
               </div>

               <div className="pt-4 border-t border-slate-100">
                 <label className="block text-sm font-bold mb-3">Allowed Attendance Methods</label>
                 <div className="space-y-3">
                   {(['telegram', 'gps', 'qr', 'face', 'fingerprint'] as const).map(m => (
                     <label key={m} className="flex items-center gap-3 cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={formData.attendance_methods[m] || false}
                         onChange={() => toggleMethod(m)}
                         className="w-5 h-5 text-indigo-600 rounded"
                       />
                       <span className="capitalize">{m}</span>
                     </label>
                   ))}
                 </div>
               </div>

               <div className="flex gap-3 pt-6">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">Cancel</button>
                 <button type="submit" className="flex-1 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium">Save Organization</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
