'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import GpsModal from '@/components/GpsModal';

const FaceCheckInModal = dynamic(() => import('@/components/FaceCheckInModal'), { ssr: false });
const FaceRegistrationModal = dynamic(() => import('@/components/FaceRegistrationModal'), { ssr: false });
const QrScannerModal = dynamic(() => import('@/components/QrScannerModal'), { ssr: false });
const NfcScannerModal = dynamic(() => import('@/components/NfcScannerModal'), { ssr: false });

import Link from 'next/link';
import { getOrgSlug, applyOrg } from '@/lib/org-client';
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
  Loader2,
  Settings
} from 'lucide-react';

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'attendance' | 'dashboard' | 'history' | 'payroll'>('attendance');
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [showFaceCheckInModal, setShowFaceCheckInModal] = useState(false);
  const [showFaceRegModal, setShowFaceRegModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showNfcModal, setShowNfcModal] = useState(false);

  const [activatedEmployee, setActivatedEmployee] = useState<any>(null);
  const [activationInput, setActivationInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');

  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [substituteFor, setSubstituteFor] = useState<string>('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await applyOrg(supabase.from('employees').select('employee_code, name').eq('active', true)).range(0, 999);
      if (data) setEmployeesList(data);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const checkActivation = async () => {
      const code = localStorage.getItem('employeeCode');
      if (code) {
        // Assume already verified for this demo, or verify with DB
        const { data, error } = await applyOrg(supabase.from('employees').select('*')).eq('employee_code', code).single();
        if (data) {
          setActivatedEmployee(data);
          
          // Auto-link Telegram ID if inside Telegram Web App
          // @ts-ignore
          const tgWindow = window;
          if (tgWindow.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            const tgId = tgWindow.Telegram.WebApp.initDataUnsafe.user.id.toString();
            if (data.telegram_id !== tgId) {
              applyOrg(supabase.from('employees'))
                .update({ telegram_id: tgId })
                .eq('employee_code', code)
                .then(({ error: updateErr }) => {
                  if (!updateErr) {
                     setActivatedEmployee({ ...data, telegram_id: tgId });
                  }
                });
            }
          }
        } else if (error && error.code !== 'PGRST116') {
          // If not a "no rows" error, it might be offline or mocked, just use local
          setActivatedEmployee({ employee_code: code, name: 'Local Employee' });
        }
      }
    };
    checkActivation();
  }, []);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');
    setIsActivating(true);
    
    try {
      const { data, error } = await applyOrg(supabase.from('employees').select('*')).eq('employee_code', activationInput).single();
      
      if (data) {
        localStorage.setItem('employeeCode', data.employee_code);
        setActivatedEmployee(data);
      } else {
        // Fallback for mocked supabase or if no row found.  Let's allow "EMP001" as a builtin mock bypass.
        if (activationInput === 'EMP001') {
           const mockData = { employee_code: 'EMP001', name: 'Narin Rina', department: 'Engineering' };
           localStorage.setItem('employeeCode', mockData.employee_code);
           setActivatedEmployee(mockData);
        } else {
           setActivationError('រកមិនឃើញលេខកូដបុគ្គលិកនេះទេ (Employee code not found).');
        }
      }
    } catch (err) {
      setActivationError('មានបញ្ហាក្នុងការភ្ជាប់ (Connection error).');
    } finally {
      setIsActivating(false);
    }
  };

  const handleAction = async (method: string, employeeCodeOverride?: string) => {
    if (method === 'gps') {
      setShowGpsModal(true);
      return;
    }
    if (method === 'face') {
      setShowFaceCheckInModal(true);
      return;
    }
    if (method === 'qr') {
      setShowQrModal(true);
      return;
    }
    if (method === 'nfc') {
      setShowNfcModal(true);
      return;
    }
    
    setCheckingIn(method);
    try {
      const targetCode = employeeCodeOverride || activatedEmployee?.employee_code;
      const targetName = employeeCodeOverride ? employeesList.find(e => e.employee_code === employeeCodeOverride)?.name || 'Kiosk User' : activatedEmployee?.name;
      
      if (targetCode) {
        const methodStr = method.replace('_success', '').replace('_in', '').replace('_out', '');
        const cType = method.includes('out') ? 'out' : 'in';

        // Record attendance to Supabase
        const { error } = await supabase.from('attendance').insert({
          org_id: getOrgSlug(),
          employee_code: targetCode,
          method: methodStr,
          check_type: cType,
          substitute_for: substituteFor || null
        });
        if (error) console.warn('Supabase insert failed', error);

        // Notify bot
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             employeeId: targetCode,
             employeeName: targetName,
             method: methodStr,
             checkType: cType,
             telegramId: employeeCodeOverride ? undefined : activatedEmployee?.telegram_id,
             substituteFor: substituteFor || undefined
          })
        });
      }
      setCheckInSuccess(method);
      setTimeout(() => setCheckInSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingIn(null);
    }
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

  if (!activatedEmployee) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl shadow-indigo-900/10 border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">SecureAttend</h1>
          <p className="text-center text-slate-500 mb-8 text-sm">បញ្ចូលលេខកូដបុគ្គលិក ដើម្បីធ្វើឱ្យដំណើរការឧបករណ៍នេះ។ (Enter Employee ID to activate this device)</p>
          
          <form onSubmit={handleActivation} className="space-y-4">
            <div>
              <input 
                type="text" 
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
                placeholder="Employee ID (e.g. EMP001)"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                required
              />
            </div>
            {activationError && <p className="text-sm text-red-500">{activationError}</p>}
            <button 
              type="submit"
              disabled={isActivating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-70 flex justify-center items-center"
            >
              {isActivating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ភ្ជាប់ (Activate)'}
            </button>
          </form>
        </div>
        <Link href="/admin" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400 hover:text-slate-600 text-sm flex items-center gap-2 transition-colors">
          <Settings className="w-4 h-4" />
          Admin Dashboard
        </Link>
      </div>
    );
  }

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
              <NavItem icon={<CalendarCheck2 />} label="ប្រវត្តិការងារ" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
              <NavItem icon={<Wallet />} label="បើកប្រាក់ខែ" active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />
            </div>
         </div>
         <div className="p-4 lg:p-6">
            <div className="mt-auto space-y-2 w-full border-t border-slate-100 pt-4">
              <NavItem icon={<Building2 />} label="ស្ថាប័ន (Institution)" onClick={() => window.location.href = '/admin'} />
              <NavItem icon={<LogOut />} label="ចាកចេញ" />
            </div>
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-48 -mt-48 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-96 h-96 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 opacity-10 blur-3xl pointer-events-none"></div>

        <header className="px-5 py-4 sm:px-8 sm:py-5 flex justify-between items-center bg-gradient-brand text-white shadow-brand sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 border border-white/30 shadow-inner">
              <ShieldCheck className="text-white w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <span className="font-semibold text-xl sm:text-2xl drop-shadow-sm block">
                SecureAttend
              </span>
              <span className="text-xs sm:text-sm text-white/90 hidden sm:block tracking-wide">ប្រព័ន្ធគ្រប់គ្រងវត្តមាន</span>
            </div>
          </div>
          
          <div className="flex items-center gap-5 sm:gap-8">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-medium text-white/80">{formattedDate || "ច័ន្ទ, ០១ មិថុនា"}</p>
               <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums drop-shadow-md">{formattedTime || "00:00:00"}</p>
             </div>
             <div className="h-11 w-11 sm:h-12 sm:w-12 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/50 shadow-inner flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:bg-white/30 transition-colors">
                <UserCircle2 className="text-white w-full h-full p-1.5 drop-shadow-sm" />
             </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full flex-1 z-0 relative">
          
          {/* Greeting Hero */}
          <div className="mb-8 max-w-3xl flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 tracking-tight leading-tight">
                សួស្តី, <span className="text-transparent bg-clip-text bg-gradient-brand">{activatedEmployee?.name || 'User'}! 👋</span>
              </h2>
              <p className="text-slate-500 mt-2 sm:mt-3 text-lg sm:text-xl">
                សូមស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងវត្តមានការងារ។ សូមជ្រើសរើសវិធីសាស្ត្ររបស់អ្នក។
              </p>
            </div>
            <button 
              onClick={() => setShowFaceRegModal(true)}
              className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-medium py-2 px-4 rounded-xl transition-colors border border-indigo-100 shadow-sm self-start sm:self-auto flex items-center gap-2"
            >
              <ScanFace className="w-4 h-4" />
              ចុះឈ្មោះផ្ទៃមុខ (Face Enroll)
            </button>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 max-w-lg">
             <div className="flex-1 w-full">
               <label className="block text-sm font-medium text-slate-700 mb-1">ជំនួសការងារបុគ្គលិកផ្សេង? (Substitute for:)</label>
               <select 
                 value={substituteFor} 
                 onChange={e => setSubstituteFor(e.target.value)}
                 className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
               >
                 <option value="">-- No Substitution --</option>
                 {employeesList.filter(e => e.employee_code !== activatedEmployee?.employee_code).map(e => (
                   <option key={e.employee_code} value={e.employee_code}>{e.name} ({e.employee_code})</option>
                 ))}
               </select>
             </div>
          </div>

          {activeTab === 'attendance' && (
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
          )}

          {activeTab === 'dashboard' && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 shadow-sm">
               <Activity className="w-12 h-12 mx-auto text-slate-300 mb-4" />
               <h3 className="text-xl font-medium text-slate-700 mb-2">ផ្ទាំងគ្រប់គ្រង (Dashboard)</h3>
               <p>មុខងារនេះកំពុងស្ថិតក្នុងការអភិវឌ្ឍន៍។ (Coming soon)</p>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 shadow-sm">
               <CalendarCheck2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
               <h3 className="text-xl font-medium text-slate-700 mb-2">ប្រវត្តិការងារ (Work History)</h3>
               <p>មុខងារនេះកំពុងស្ថិតក្នុងការអភិវឌ្ឍន៍។ (Coming soon)</p>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 shadow-sm">
               <Wallet className="w-12 h-12 mx-auto text-slate-300 mb-4" />
               <h3 className="text-xl font-medium text-slate-700 mb-2">បើកប្រាក់ខែ (Payroll)</h3>
               <p>មុខងារនេះកំពុងស្ថិតក្នុងការអភិវឌ្ឍន៍។ (Coming soon)</p>
            </div>
          )}
        </div>
      </main>

      <GpsModal 
        isOpen={showGpsModal} 
        onClose={() => setShowGpsModal(false)}
        onCheckIn={() => handleAction('gps_in')}
        onCheckOut={() => handleAction('gps_out')}
      />

      <FaceRegistrationModal 
        isOpen={showFaceRegModal}
        onClose={() => setShowFaceRegModal(false)}
        employeeId={activatedEmployee?.employee_code}
      />

      <FaceCheckInModal 
        isOpen={showFaceCheckInModal}
        onClose={() => setShowFaceCheckInModal(false)}
        employeeId={activatedEmployee?.employee_code}
        onSuccess={() => handleAction('face_success')}
      />

      <QrScannerModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        onSuccess={(empCode) => handleAction('qr_success', empCode)}
      />

      <NfcScannerModal
        isOpen={showNfcModal}
        onClose={() => setShowNfcModal(false)}
        onSuccess={(empCode) => handleAction('nfc_success', empCode)}
      />
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
