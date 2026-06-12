'use client';
import { useState, useRef, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { getOrgSlug } from '@/lib/org-client';

export default function KioskPage() {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<{ name?: string; message: string; checkType?: string }>({ message: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep focus on input
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) inputRef.current.focus();
    };
    focusInput();
    window.addEventListener('click', focusInput);
    window.addEventListener('blur', focusInput);
    return () => {
      window.removeEventListener('click', focusInput);
      window.removeEventListener('blur', focusInput);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || status === 'loading') return;
    
    const serial = inputValue.trim();
    setInputValue(''); // Clear immediately for next scan
    setStatus('loading');
    
    try {
      const res = await fetch('/api/attendance/kiosk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, orgId: getOrgSlug() })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setFeedback({ 
          name: data.employeeName, 
          message: data.message, 
          checkType: data.checkType 
        });
      } else {
        setStatus('error');
        setFeedback({ message: data.error || 'Unknown error occurred.' });
      }
    } catch (err) {
      setStatus('error');
      setFeedback({ message: 'Network error. Please try again.' });
    }
    
    // Auto reset
    setTimeout(() => {
      setStatus('idle');
      setFeedback({ message: '' });
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden text-white font-sans selection:bg-transparent">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500 blur-[120px]"></div>
      </div>

      <div className="z-10 text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 tabular-nums">
          {currentTime.toLocaleTimeString('en-US', { hour12: false })}
        </h1>
        <p className="text-xl md:text-2xl text-slate-400">
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="z-10 w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-[3rem] p-12 flex flex-col items-center justify-center shadow-2xl relative min-h-[400px]">
        
        {status === 'idle' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping"></div>
              <CreditCard className="w-16 h-16 text-indigo-400" />
            </div>
            <h2 className="text-3xl font-semibold mb-2">Please tap your ID card</h2>
            <p className="text-slate-400 text-lg">Use the NFC/RFID reader below</p>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
             <Loader2 className="w-24 h-24 text-indigo-400 animate-spin mb-6" />
             <h2 className="text-2xl font-medium text-slate-300">Processing...</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 text-center">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-emerald-500/20 text-emerald-400`}>
              <CheckCircle2 className="w-20 h-20" />
            </div>
            <h2 className="text-4xl font-bold mb-2">{feedback.name}</h2>
            <div className="flex items-center gap-2 text-2xl font-medium mt-2">
               <span className={`px-4 py-1 rounded-full border ${feedback.checkType === 'in' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-amber-500/20 border-amber-500/50 text-amber-300'} uppercase tracking-wider text-lg`}>
                 CHECK {feedback.checkType}
               </span>
            </div>
            <p className="text-slate-300 mt-4 text-xl">{feedback.message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 text-center">
            <div className="w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-20 h-20" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-rose-300">Access Denied</h2>
            <p className="text-slate-300 text-xl">{feedback.message}</p>
          </div>
        )}

        {/* Hidden form to capture USB reader input */}
        <form onSubmit={handleSubmit} className="absolute opacity-0 pointer-events-none">
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoComplete="off"
            // onBlur={() => inputRef.current?.focus()} // handled by useEffect
          />
        </form>

      </div>
      
      <div className="absolute bottom-8 mt-12 text-slate-500 flex items-center gap-2">
        <Clock className="w-4 h-4" /> Auto-toggles IN/OUT based on last scan
      </div>
    </div>
  );
}
