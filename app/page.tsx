'use client';

import { useState, useEffect } from 'react';
import { 
  MapPin, 
  ScanFace, 
  QrCode, 
  CreditCard, 
  ChevronRight, 
  Clock, 
  ShieldCheck, 
  Activity, 
  Building2, 
  LogOut,
  UserCircle2,
  CalendarCheck2,
  Wallet,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'dashboard'>('attendance');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = (method: string) => {
    setCheckingIn(method);
    // Simulate API call to Supabase
    setTimeout(() => {
      setCheckingIn(null);
      setCheckInSuccess(method);
      setTimeout(() => setCheckInSuccess(null), 3000);
    }, 1500);
  };

  const formattedTime = currentTime?.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime?.toLocaleDateString('km-KH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between hidden">
         <div className="p-4 lg:p-6 flex flex-col items-center lg:items-start">
            <div className="w-10 h-10 lg:w-auto flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/20">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <span className="font-semibold text-xl hidden lg:block bg-gradient-to-br from-indigo-900 to-violet-900 bg-clip-text text-transparent">
                SecureAttend
              </span>
            </div>
            
            <div className="mt-12 space-y-2 w-full">
              <NavItem icon={<Clock />} label="កត់ត្រាវត្តមាន" active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} />
              <NavItem icon={<Activity />} label="ផ្ទាំងគ្រប់គ្រង" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
              <NavItem icon={<CalendarCheck2 />} label="ប្រវត្តិការងារ" />
              <NavItem icon={<Wallet />} label="បើកប្រាក់ខែ" />
            </div>
         </div>
         <div className="p-4 lg:p-6">
            <div className="mt-auto space-y-2 w-full border-t border-slate-100 pt-4">
              <NavItem icon={<Building2 />} label="ស្ថាប័ន (Institution)" />
              <NavItem icon={<LogOut />} label="ចាកចេញ" />
            </div>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-48 -mt-48 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-96 h-96 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 opacity-10 blur-3xl pointer-events-none"></div>

        <header className="px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-10">
          <div className="flex items-center gap-3 md:hidden">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="font-semibold text-lg bg-gradient-to-br from-indigo-900 to-violet-900 bg-clip-text text-transparent">
              SecureAttend
            </span>
          </div>
          <div className="hidden md:block">
             <h1 className="text-2xl font-semibold tracking-tight text-slate-800">ប្រព័ន្ធគ្រប់គ្រងវត្តមាន</h1>
             <p className="text-sm text-slate-500 mt-1">Multi-tenant Employee Attendance & HR</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-medium text-slate-600">{formattedDate || "ច័ន្ទ, ០១ មិថុនា"}</p>
               <p className="text-2xl font-semibold tracking-tight text-slate-900 font-sans tabular-nums">{formattedTime || "00:00:00"}</p>
             </div>
             <div className="h-10 w-10 bg-slate-200 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-indigo-500 transition-colors">
                <UserCircle2 className="text-slate-500 w-full h-full" />
             </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full flex-1 z-0 relative">
          
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Column: Live Check-in Panel */}
            <div className="xl:col-span-7 flex flex-col gap-6">
              
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-900/5 border border-slate-200/60 relative overflow-hidden">
                {/* Visual Premium Gradient inside the card */}
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500"></div>
                
                <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
                  <ScanFace className="w-5 h-5 text-indigo-600" />
                  ជ្រើសរើសវិធីសាស្ត្រកត់ត្រាវត្តមាន (Check-in Method)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CheckInCard 
                    title="ទីតាំង GPS" 
                    subtitle="កត់ត្រាតាមរយៈទីតាំងទូរស័ព្ទ" 
                    icon={<MapPin className="w-8 h-8"/>} 
                    color="text-emerald-600" 
                    bg="bg-emerald-50 hover:bg-emerald-100" 
                    onClick={() => handleAction('gps')}
                    loading={checkingIn === 'gps'}
                    success={checkInSuccess === 'gps'}
                  />
                  <CheckInCard 
                    title="ស្កេនមុខ (Face Match)" 
                    subtitle="បញ្ជាក់អត្តសញ្ញាណតាមផ្ទៃមុខ" 
                    icon={<ScanFace className="w-8 h-8"/>} 
                    color="text-indigo-600" 
                    bg="bg-indigo-50 hover:bg-indigo-100"
                    onClick={() => handleAction('face')}
                    loading={checkingIn === 'face'}
                    success={checkInSuccess === 'face'}
                  />
                  <CheckInCard 
                    title="កូដ QR" 
                    subtitle="ស្កេនកូដពីកាមេរ៉ារបស់ស្ថាប័ន" 
                    icon={<QrCode className="w-8 h-8"/>} 
                    color="text-violet-600" 
                    bg="bg-violet-50 hover:bg-violet-100"
                    onClick={() => handleAction('qr')}
                    loading={checkingIn === 'qr'}
                    success={checkInSuccess === 'qr'}
                  />
                  <CheckInCard 
                    title="កាត NFC" 
                    subtitle="ផ្ដិតកាតបុគ្គលិកនៅឧបករណ៍" 
                    icon={<CreditCard className="w-8 h-8"/>} 
                    color="text-orange-500" 
                    bg="bg-orange-50 hover:bg-orange-100"
                    onClick={() => handleAction('nfc')}
                    loading={checkingIn === 'nfc'}
                    success={checkInSuccess === 'nfc'}
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Status & Recent Logs */}
            <div className="xl:col-span-5 flex flex-col gap-6">
              
              {/* Status Card (Premium dark gradient) */}
              <div className="rounded-3xl p-6 sm:p-8 shrink-0 relative overflow-hidden shadow-2xl shadow-indigo-900/10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-900 z-0"></div>
                
                <div className="relative z-10 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/70 text-sm font-medium uppercase tracking-wider">ស្ថានភាពថ្ងៃនេះ</p>
                      <h3 className="text-2xl font-semibold mt-1">កំពុងធ្វើការ (Working)</h3>
                    </div>
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-white">
                      TechCorp Inc.
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg"><Clock className="w-4 h-4 text-white" /></div>
                        <div>
                          <p className="text-sm text-white/70">ម៉ោងចូល (Check In)</p>
                          <p className="font-semibold tabular-nums">08:05:22 AM</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-300 font-medium">+5 mins early</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                       <div className="p-2 bg-white/10 rounded-lg"><Activity className="w-4 h-4 text-white" /></div>
                       <div>
                         <p className="text-sm text-white/70">ម៉ោងសរុប (Total Hours)</p>
                         <p className="font-semibold tabular-nums">6 hrs 42 mins</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Mini-list */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex-1">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center justify-between">
                  ប្រវត្តិថ្មីៗ (Recent Logs)
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">មើលទាំងអស់</button>
                </h3>
                <div className="space-y-4">
                  <LogItem type="in" method="Face Match" time="08:05:22 AM" date="Today" />
                  <LogItem type="out" method="GPS" time="05:30:15 PM" date="Yesterday" />
                  <LogItem type="in" method="NFC" time="07:58:10 AM" date="Yesterday" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helpers
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
    >
      <div className={`flex-shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
        {icon}
      </div>
      <span className="lg:block hidden text-sm">{label}</span>
      {active && <div className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full lg:block hidden"></div>}
    </button>
  );
}

function CheckInCard({ title, subtitle, icon, color, bg, onClick, loading, success }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={loading || success}
      className={`${bg} border border-transparent hover:border-slate-300/30 p-5 rounded-2xl flex flex-col items-start gap-4 transition-all hover:scale-[1.02] hover:-translate-y-1 active:scale-95 text-left group relative overflow-hidden disabled:opacity-80 disabled:hover:scale-100 disabled:hover:translate-y-0`}
    >
      <div className={`p-4 bg-white rounded-2xl shadow-sm ${color} transition-transform group-hover:scale-110`}>
        {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : (success ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : icon)}
      </div>
      <div className="z-10">
        <h3 className="font-semibold text-slate-800 text-lg mb-1">{title}</h3>
        <p className="text-xs text-slate-500 font-medium max-w-[180px]">{subtitle}</p>
      </div>
      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
        <ChevronRight className={`w-5 h-5 ${color}`} />
      </div>
      {/* Decorative background element */}
      <div className="absolute -right-8 -bottom-8 opacity-5">
        <div className="transform scale-[3]">{icon}</div>
      </div>
    </button>
  );
}

function LogItem({ type, method, time, date }: { type: 'in' | 'out', method: string, time: string, date: string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-default">
      <div className={`p-2 rounded-lg ${type === 'in' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
        {type === 'in' ? <MapPin className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-800 text-sm">Check {type === 'in' ? 'In' : 'Out'} • <span className="text-slate-500 font-normal">{method}</span></p>
        <p className="text-xs text-slate-400 mt-0.5">{date}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-slate-700">{time}</p>
      </div>
    </div>
  );
}
