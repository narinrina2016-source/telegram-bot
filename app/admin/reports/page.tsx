'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Download, Loader2, Search, Send } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from 'date-fns';
import { applyOrg } from '@/lib/org-client';
import { fetchOrgSettings } from '@/lib/org-settings';

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reportData, setReportData] = useState<any[]>([]);

  const [isSending, setIsSending] = useState(false);
  const [targetChatId, setTargetChatId] = useState('158608639');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(parseISO(`${reportMonth}-01`)).toISOString();
      const end = endOfMonth(parseISO(`${reportMonth}-01`)).toISOString();

      // Fetch employees
      const { data: employees } = await applyOrg(supabase
        .from('employees')
        .select('*'))
        .eq('active', true)
        .range(0, 999);
      
      // Fetch settings for late/early calc
      const { settings } = await fetchOrgSettings();
        
      let workStart = settings.work_start_time || '08:00';
      let workEnd = settings.work_end_time || '17:00';

      // Fetch attendance in this month
      const { data: attendance } = await applyOrg(supabase
        .from('attendance')
        .select('*'))
        .gte('recorded_at', start)
        .lte('recorded_at', end)
        .range(0, 9999);

      if (employees && attendance) {
        const aggregated = employees.map(emp => {
          const empRecords = attendance.filter(a => 
             (a.employee_code === emp.employee_code && !a.substitute_for) || 
             (a.substitute_for === emp.employee_code)
          );
          
          // Group by day
          const byDay: Record<string, any[]> = {};
          empRecords.forEach(r => {
            const dateStr = format(parseISO(r.recorded_at), 'yyyy-MM-dd');
            if (!byDay[dateStr]) byDay[dateStr] = [];
            byDay[dateStr].push(r);
          });
          
          let daysWorked = 0;
          let lateDays = 0;
          let earlyCheckoutDays = 0;
          let totalMinutesOffices = 0;

          Object.keys(byDay).forEach(date => {
            const records = byDay[date].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
            
            const checkIns = records.filter(r => r.check_type === 'in');
            const checkOuts = records.filter(r => r.check_type === 'out');
            
            if (checkIns.length > 0) {
              daysWorked++;
              
              const firstIn = parseISO(checkIns[0].recorded_at);
              const workStartDT = parseISO(`${date}T${workStart}:00`);
              if (differenceInMinutes(firstIn, workStartDT) > 5) {
                lateDays++; // grace period of 5 mins
              }
              
              if (checkOuts.length > 0) {
                 const lastOut = parseISO(checkOuts[checkOuts.length - 1].recorded_at);
                 const workEndDT = parseISO(`${date}T${workEnd}:00`);
                 if (differenceInMinutes(workEndDT, lastOut) > 5) {
                    earlyCheckoutDays++;
                 }
                 
                 const mins = differenceInMinutes(lastOut, firstIn);
                 if (mins > 0) totalMinutesOffices += mins;
              }
            }
          });

          return {
            ...emp,
            daysWorked,
            lateDays,
            earlyCheckoutDays,
            totalHoursFixed: (totalMinutesOffices / 60).toFixed(1)
          };
        });

        setReportData(aggregated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportMonth]);

  const exportCSV = () => {
    const headers = ['Employee Code', 'Name', 'Department', 'Days Worked', 'Late Check-ins', 'Early Check-outs', 'Total Hours'];
    const rows = filteredData.map(r => [
      r.employee_code,
      r.name,
      r.department || '',
      r.daysWorked,
      r.lateDays,
      r.earlyCheckoutDays,
      r.totalHoursFixed
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${reportMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendToTelegram = async () => {
    if (reportData.length === 0) return;
    if (!targetChatId.trim()) {
      alert('Please enter a target Telegram Chat ID.');
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch('/api/telegram/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportMonth,
          data: reportData,
          chatId: targetChatId.trim()
        })
      });
      const result = await res.json();
      if (result.success) {
        alert('Chart sent to Telegram successfully!');
      } else {
        alert('Failed to send: ' + result.error);
      }
    } catch (e) {
      alert('Error sending chart to Telegram.');
    } finally {
      setIsSending(false);
    }
  };

  const filteredData = reportData.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Monthly Report</h1>
          <p className="text-slate-500 mt-2">View attendance summaries and working hours.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-indigo-600 outline-none">
            <span className="text-xs font-semibold text-slate-400 font-mono">TG ID:</span>
            <input 
              type="text"
              placeholder="Telegram ID"
              value={targetChatId}
              onChange={e => setTargetChatId(e.target.value)}
              className="w-28 outline-none text-sm text-slate-700 bg-transparent font-mono"
            />
          </div>
          <input 
            type="month" 
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
          />
          <button 
            onClick={sendToTelegram}
            disabled={reportData.length === 0 || isSending}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Telegram
          </button>
          <button 
            onClick={exportCSV}
            disabled={reportData.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-sm md:text-base">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
           <Search className="w-5 h-5 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search by name or code..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="bg-transparent border-none outline-none w-full text-slate-700 placeholder-slate-400"
           />
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-medium text-sm border-b border-slate-200">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Code</th>
                  <th className="p-4 text-center">Days Worked</th>
                  <th className="p-4 text-center">Late In</th>
                  <th className="p-4 text-center">Early Out</th>
                  <th className="p-4 text-right">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map(emp => (
                  <tr key={emp.employee_code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{emp.name}</td>
                    <td className="p-4 text-slate-600 font-mono text-sm">{emp.employee_code}</td>
                    <td className="p-4 text-center font-semibold text-slate-700">{emp.daysWorked}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md ${emp.lateDays > 0 ? 'bg-rose-100 text-rose-700 font-semibold' : 'text-slate-500'}`}>
                        {emp.lateDays}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-600">{emp.earlyCheckoutDays}</td>
                    <td className="p-4 text-right font-mono font-medium text-indigo-700">{emp.totalHoursFixed}</td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No data found for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
