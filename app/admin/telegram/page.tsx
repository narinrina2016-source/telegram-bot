'use client';
import { useState, useEffect } from 'react';
import { MapPin, MessageSquare, Send, Users, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { applyOrg } from '@/lib/org-client';

export default function AdminTelegram() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await applyOrg(supabase
        .from('employees')
        .select('*'))
        .not('telegram_id', 'is', null)
        .eq('active', true)
        .range(0, 999);
        
      if (data) {
        setEmployees(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEmployees();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSending(true);
    setSendResult('');
    
    try {
      // In a real app we would have an API endpoint to broadcast
      // Since we already have /api/notify we could use it, but let's build a separate endpoint for general broadcasting or just mock it here.
      
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (response.ok) {
        setSendResult(`Successfully sent to ${employees.length} users.`);
        setMessage('');
      } else {
        setSendResult('Failed to send broadcast.');
      }
    } catch (err) {
      console.error(err);
      setSendResult('Error broadcasting message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Telegram Setup & Broadcast</h1>
        <p className="text-slate-500 mt-2">Manage Telegram integration and send announcements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Connection Status */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
             <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
               <ShieldCheck className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-bold text-slate-800">Connection</h2>
           </div>
           
           <div className="space-y-4 text-slate-600">
             <p>Users can link their Telegram accounts by opening the Telegram Bot and pressing &quot;Open App&quot;, which auto-links them.</p>
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="font-medium">Linked Employees:</span>
                <span className="text-lg font-bold text-sky-600">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : employees.length}
                </span>
             </div>
             
             <div className="pt-4 border-t border-slate-100 mt-2">
               <p className="mb-2 font-medium">Webhook Setup</p>
               <button 
                 onClick={async () => {
                   try {
                     const res = await fetch('/api/telegram/register', { 
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ origin: window.location.origin })
                     });
                     const data = await res.json();
                     if (data.success) {
                       alert('Webhook connected successfully!');
                     } else {
                       alert('Failed: ' + data.error + '\n\nMake sure to add TELEGRAM_BOT_TOKEN to Environment Variables in AI Studio Settings.');
                     }
                   } catch(e) { alert('Error occurred'); }
                 }}
                 className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium transition-colors"
               >
                 Register Bot Webhook
               </button>
             </div>

             <p className="text-xs text-slate-400">
               * The bot uses the token set in environmental variables. Admin group notifications are automatically sent.
             </p>
           </div>
        </div>

        {/* Broadcast Form */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col">
           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
             <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
               <MessageSquare className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-bold text-slate-800">Broadcast Message</h2>
           </div>

           <form onSubmit={handleBroadcast} className="flex-1 flex flex-col">
             <textarea
               value={message}
               onChange={(e) => setMessage(e.target.value)}
               placeholder="Enter announcement message to all linked staff..."
               className="w-full h-32 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none resize-none mb-4"
               required
             />
             
             <div className="mt-auto flex items-center justify-between">
               <span className={`text-sm font-medium ${sendResult.includes('Success') ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {sendResult}
               </span>
               <button 
                 type="submit" 
                 disabled={isSending || employees.length === 0}
                 className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70"
               >
                 {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                 Send to All
               </button>
             </div>
           </form>
        </div>

      </div>
    </div>
  );
}
