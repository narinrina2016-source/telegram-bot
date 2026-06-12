'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from 'date-fns';
import { Loader2, Search, Send, Calculator, FileText, Plus, Check } from 'lucide-react';
import { applyOrg, getOrgSlug } from '@/lib/org-client';
import { fetchOrgSettings } from '@/lib/org-settings';

export default function AdminPayroll() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [payrollData, setPayrollData] = useState<any[]>([]);
  
  // Adjustments Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedEmpCode, setSelectedEmpCode] = useState('');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjType, setAdjType] = useState('addition');
  const [adjDesc, setAdjDesc] = useState('');
  const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({});
  const [sentStates, setSentStates] = useState<Record<string, boolean>>({});

  const fetchPayroll = async () => {
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
      
      // Fetch settings
      const { settings } = await fetchOrgSettings();
        
      let workStart = settings.work_start_time || '08:00';
      let workEnd = settings.work_end_time || '17:00';

      // Fetch attendance
      const { data: attendance } = await applyOrg(supabase
        .from('attendance')
        .select('*'))
        .gte('recorded_at', start)
        .lte('recorded_at', end)
        .range(0, 9999);

      // Fetch adjustments
      const { data: adjustments } = await applyOrg(supabase
        .from('payroll_adjustments')
        .select('*'))
        .eq('month', reportMonth)
        .range(0, 9999);

      // Fetch timesheets
      const { data: timesheets } = await applyOrg(supabase
        .from('timesheets')
        .select('*'))
        .gte('work_date', format(parseISO(start), 'yyyy-MM-dd'))
        .lte('work_date', format(parseISO(end), 'yyyy-MM-dd'))
        .range(0, 9999);

      if (employees) {
        const calculated = employees.map(emp => {
          // get records where this employee tapped in normally, OR someone else tapped in FOR them.
          // BUT exclude records where this employee tapped in FOR someone else.
          const empRecords = attendance?.filter(a => 
             (a.employee_code === emp.employee_code && !a.substitute_for) || 
             (a.substitute_for === emp.employee_code)
          ) || [];
          
          const empAdjustments = adjustments?.filter(a => a.employee_code === emp.employee_code) || [];
          const empTimesheets = timesheets?.filter(t => t.employee_code === emp.employee_code) || [];
          
          let totalMinutesOffices = 0;
          let daysWorked = 0;
          let lateDays = 0;

          // Group by day for hours calc (simplified)
          const byDay: Record<string, any[]> = {};
          empRecords.forEach(r => {
            const dateStr = format(parseISO(r.recorded_at), 'yyyy-MM-dd');
            if (!byDay[dateStr]) byDay[dateStr] = [];
            byDay[dateStr].push(r);
          });

          Object.keys(byDay).forEach(date => {
            const records = byDay[date].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
            const checkIns = records.filter(r => r.check_type === 'in');
            const checkOuts = records.filter(r => r.check_type === 'out');
            
            if (checkIns.length > 0) {
              daysWorked++;
              const firstIn = parseISO(checkIns[0].recorded_at);
              const workStartDT = parseISO(`${date}T${workStart}:00`);
              if (differenceInMinutes(firstIn, workStartDT) > 5) lateDays++;
              
              if (checkOuts.length > 0) {
                 const lastOut = parseISO(checkOuts[checkOuts.length - 1].recorded_at);
                 const mins = differenceInMinutes(lastOut, firstIn);
                 if (mins > 0) totalMinutesOffices += mins;
              }
            }
          });

          let totalHours = totalMinutesOffices / 60;
          let grossPay = 0;

          if (emp.payroll_type === 'hourly') {
             // For hourly workers, pull from Timesheets if available, otherwise fallback to check-in logs
             let tsHours = empTimesheets.reduce((acc, t) => acc + Number(t.hours_worked || 0), 0);
             if (tsHours > 0) {
                 totalHours = tsHours;
             }
             grossPay = totalHours * (emp.hourly_rate || 0);
          } else {
             grossPay = emp.base_salary || 0;
          }

          let netAdditions = 0;
          let netDeductions = 0;

          empAdjustments.forEach(adj => {
             if (adj.adj_type === 'addition') netAdditions += Number(adj.amount);
             if (adj.adj_type === 'deduction') netDeductions += Number(adj.amount);
          });

          const netPay = grossPay + netAdditions - netDeductions;

          return {
             ...emp,
             totalHours: totalHours.toFixed(1),
             grossPay,
             netAdditions,
             netDeductions,
             netPay,
             daysWorked,
             lateDays
          };
        });

        setPayrollData(calculated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportMonth]);

  const handleSaveAdj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpCode || adjAmount <= 0) return;

    try {
       await supabase.from('payroll_adjustments').insert({
         org_id: getOrgSlug(),
         employee_code: selectedEmpCode,
         month: reportMonth,
         amount: adjAmount,
         adj_type: adjType,
         description: adjDesc
       });
       setIsAdjModalOpen(false);
       setAdjAmount(0);
       setAdjDesc('');
       fetchPayroll(); // refetch
    } catch (err) {
       console.error(err);
       alert('Error saving adjustment');
    }
  };

  const openAdjModal = (empCode: string) => {
    setSelectedEmpCode(empCode);
    setAdjAmount(0);
    setAdjType('addition');
    setAdjDesc('');
    setIsAdjModalOpen(true);
  };

  const sendPayslip = async (emp: any) => {
    if (!emp.telegram_id) {
       alert("Employee has no Telegram ID linked.");
       return;
    }

    setSendingStates(prev => ({ ...prev, [emp.employee_code]: true }));

    const message = `
*PAYSLIP / ប័ណ្ណប្រាក់ខែ*
**Month:** ${reportMonth}
------------------------
*Name:* ${emp.name}
*ID:* ${emp.employee_code}
*Type:* ${emp.payroll_type === 'monthly' ? 'Monthly' : 'Hourly'}

*Summary:*
Worked: ${emp.daysWorked} days
Hours: ${emp.totalHours} hrs
Late: ${emp.lateDays} times

*Earnings:*
Gross Pay: $${emp.grossPay.toFixed(2)}
Additions: $${emp.netAdditions.toFixed(2)}
Deductions: -$${emp.netDeductions.toFixed(2)}

*NET PAY:* $${emp.netPay.toFixed(2)}
------------------------
`;

    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, specificTelegramId: emp.telegram_id })
      });
      
      if (response.ok) {
         setSentStates(prev => ({ ...prev, [emp.employee_code]: true }));
         setTimeout(() => {
           setSentStates(prev => ({ ...prev, [emp.employee_code]: false }));
         }, 3000);
      } else {
         throw new Error("API failed");
      }
    } catch (err) {
       alert("Failed to send payslip. Make sure Bot is configured.");
    } finally {
       setSendingStates(prev => ({ ...prev, [emp.employee_code]: false }));
    }
  };

  const filteredData = payrollData.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Payroll Engine</h1>
          <p className="text-slate-500 mt-2">Manage monthly calculations, adjustments, and payslips.</p>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-auto">
          <input 
            type="month" 
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-sm md:text-base">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
           <Search className="w-5 h-5 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search employee..."
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
                  <th className="p-4 text-center">Basis</th>
                  <th className="p-4 text-right">Gross</th>
                  <th className="p-4 text-right text-emerald-600">Adds</th>
                  <th className="p-4 text-right text-rose-600">Deds</th>
                  <th className="p-4 text-right font-bold">Net Pay</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map(emp => (
                  <tr key={emp.employee_code} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                       <div className="font-medium text-slate-800">{emp.name}</div>
                       <div className="text-xs text-slate-500 font-mono mt-0.5">{emp.employee_code} ({emp.totalHours} hrs)</div>
                    </td>
                    <td className="p-4 text-center text-slate-600 text-sm uppercase">
                        {emp.payroll_type}
                    </td>
                    <td className="p-4 text-right font-mono text-slate-600">${emp.grossPay.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-emerald-600">${emp.netAdditions.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-rose-600">-${emp.netDeductions.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono font-bold text-indigo-700 text-lg">
                       ${emp.netPay.toFixed(2)}
                    </td>
                    <td className="p-4 text-center space-x-2">
                       <button 
                         onClick={() => openAdjModal(emp.employee_code)}
                         className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-block"
                         title="Add Adjustment"
                       >
                         <Calculator className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => sendPayslip(emp)}
                         disabled={!emp.telegram_id || sendingStates[emp.employee_code]}
                         className={`p-2 rounded-lg transition-colors inline-block ${sentStates[emp.employee_code] ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 hover:bg-sky-200 text-sky-600'} disabled:opacity-40 disabled:hover:bg-sky-100`}
                         title="Send via Telegram"
                       >
                         {sendingStates[emp.employee_code] ? <Loader2 className="w-4 h-4 animate-spin" /> : sentStates[emp.employee_code] ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                       </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No employees available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
             <h2 className="text-xl font-bold text-slate-800 mb-4">Add Payroll Adjustment</h2>
             <form onSubmit={handleSaveAdj} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    value={adjType} 
                    onChange={e => setAdjType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none"
                  >
                     <option value="addition">Addition (Bonus, Overtime)</option>
                     <option value="deduction">Deduction (Late, Unpaid Leave)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
                  <input 
                    required 
                    type="number" 
                    step="any"
                    value={adjAmount} 
                    onChange={e => setAdjAmount(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input 
                    required 
                    type="text" 
                    value={adjDesc} 
                    onChange={e => setAdjDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" 
                    placeholder="e.g. Sales Bonus"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsAdjModalOpen(false)} className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
                    Save
                  </button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
}
