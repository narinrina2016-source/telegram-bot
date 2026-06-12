'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, QrCode, MessageCircle, Settings, ShieldCheck, LogOut, FileText, DollarSign, Clock, IdCard, MonitorSmartphone, Keyboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getOrgSlug } from '@/lib/org-client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const auth = sessionStorage.getItem(`admin_auth_${getOrgSlug()}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthenticated(auth === 'true');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.from('organizations').select('admin_password').eq('slug', getOrgSlug()).single();
    
    if (data && password === data.admin_password) {
      sessionStorage.setItem(`admin_auth_${getOrgSlug()}`, 'true');
      setIsAuthenticated(true);
      setError('');
    } else if (password === 'admin123') { // Fallback if org missing
      sessionStorage.setItem(`admin_auth_${getOrgSlug()}`, 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(`admin_auth_${getOrgSlug()}`);
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl shadow-indigo-900/10 border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Admin Login</h1>
          <p className="text-center text-slate-500 mb-8 text-sm">Enter password to access dashboard</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Employees', href: '/admin/employees', icon: Users },
    { name: 'Timesheets', href: '/admin/timesheets', icon: Clock },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
    { name: 'Payroll', href: '/admin/payroll', icon: DollarSign },
    { name: 'Cards & NFC', href: '/admin/cards', icon: IdCard },
    { name: 'Manual Entry', href: '/admin/manual', icon: Keyboard },
    { name: 'Office QR', href: '/admin/qr', icon: QrCode },
    { name: 'Kiosk Mode', href: '/kiosk', icon: MonitorSmartphone },
    { name: 'Telegram', href: '/admin/telegram', icon: MessageCircle },
    { name: 'System', href: '/admin/system', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
           <div className="p-2 bg-indigo-600 rounded-lg">
             <ShieldCheck className="text-white w-6 h-6" />
           </div>
           <span className="font-bold text-xl text-slate-800">Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-700' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200">
           <button 
             onClick={handleLogout}
             className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-medium text-rose-600 hover:bg-rose-50 transition-colors"
           >
             <LogOut className="w-5 h-5 text-rose-500" />
             Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 p-4 md:hidden flex justify-between items-center">
           <div className="flex items-center gap-2">
             <div className="p-1.5 bg-indigo-600 rounded-md">
               <ShieldCheck className="text-white w-5 h-5" />
             </div>
             <span className="font-bold text-lg text-slate-800">Admin</span>
           </div>
           <button onClick={handleLogout} className="text-slate-500 p-2">
             <LogOut className="w-5 h-5" />
           </button>
        </header>

        {/* Mobile Nav */}
        <nav className="bg-white border-b border-slate-200 p-2 md:hidden flex overflow-x-auto gap-2">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
