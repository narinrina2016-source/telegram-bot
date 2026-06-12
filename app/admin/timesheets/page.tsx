'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { applyOrg, getOrgSlug } from '@/lib/org-client';
import { Loader2, Save, CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function TimesheetsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  
  // Timesheet
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hoursWorked, setHoursWorked] = useState(0);
  const [timesheetsList, setTimesheetsList] = useState<any[]>([]);
  
  // Schedule
  const [schedule, setSchedule] = useState<any[]>([]);
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const fetchTimesheets = async () => {
    const { data } = await applyOrg(supabase.from('timesheets').select('*')).eq('employee_code', selectedEmp).order('work_date', { ascending: false }).limit(30);
    if (data) setTimesheetsList(data);
  };

  const fetchSchedule = async () => {
    const { data } = await applyOrg(supabase.from('weekly_schedules').select('*')).eq('employee_code', selectedEmp);
    if (data) {
       const sched = daysOfWeek.map((day, i) => {
          const s = data.find((d: any) => d.day_of_week === i);
          return s ? s : { employee_code: selectedEmp, day_of_week: i, start_time: '', end_time: '' };
       });
       setSchedule(sched);
    }
  };

  useEffect(() => {
    applyOrg(supabase.from('employees').select('*')).eq('active', true).range(0, 999).then(({ data }) => setEmployees(data || []));
  }, []);

  useEffect(() => {
    if (selectedEmp) {
      setTimeout(() => {
        fetchTimesheets();
        fetchSchedule();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmp]);

  const saveTimesheet = async () => {
    if (!selectedEmp || hoursWorked <= 0) return;
    await applyOrg(supabase.from('timesheets')).upsert({
      org_id: getOrgSlug(),
      employee_code: selectedEmp,
      work_date: entryDate,
      hours_worked: hoursWorked
    }, { onConflict: 'employee_code,work_date' }).catch(() => {
      supabase.from('timesheets').insert({ org_id: getOrgSlug(), employee_code: selectedEmp, work_date: entryDate, hours_worked: hoursWorked }).then(() => fetchTimesheets());
    });
    fetchTimesheets();
  };

  const saveSchedule = async (dayIndex: number) => {
    const s = schedule[dayIndex];
    if (!s.start_time || !s.end_time) return;
    // try to delete then insert or just insert (assuming no upsert constraints)
    await applyOrg(supabase.from('weekly_schedules')).delete().eq('employee_code', selectedEmp).eq('day_of_week', dayIndex);
    await supabase.from('weekly_schedules').insert({
       org_id: getOrgSlug(), employee_code: selectedEmp, day_of_week: dayIndex, start_time: s.start_time, end_time: s.end_time
    });
    alert('Schedule saved');
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Timesheets & Schedules</h1>
        <p className="text-slate-500 mt-2">Manage daily hours for hourly workers and set weekly schedules.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Employee</label>
        <select 
          value={selectedEmp} 
          onChange={e => setSelectedEmp(e.target.value)}
          className="w-full md:w-1/2 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none bg-slate-50"
        >
          <option value="">-- Choose --</option>
          {employees.map(e => <option key={e.employee_code} value={e.employee_code}>{e.name} ({e.payroll_type})</option>)}
        </select>
      </div>

      {selectedEmp && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-600" /> Daily Timesheet</h2>
            
            <div className="flex gap-3 mb-6">
               <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl outline-none" />
               <input type="number" step="any" placeholder="Hours" value={hoursWorked} onChange={e => setHoursWorked(parseFloat(e.target.value))} className="px-3 py-2 border border-slate-300 rounded-xl outline-none w-24" />
               <button onClick={saveTimesheet} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium whitespace-nowrap">Log Hours</button>
            </div>

            <div className="space-y-2">
               <h3 className="text-sm font-medium text-slate-500 mb-3">Recent Entries</h3>
               {timesheetsList.map((t) => (
                 <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-medium text-slate-700">{t.work_date}</span>
                    <span className="text-indigo-600 font-bold">{t.hours_worked} hrs</span>
                 </div>
               ))}
               {timesheetsList.length === 0 && <p className="text-sm text-slate-400">No recent timesheets.</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-indigo-600" /> Weekly Schedule</h2>
            
            <div className="space-y-4">
               {schedule.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                     <span className="w-24 text-sm font-medium text-slate-700">{daysOfWeek[idx]}</span>
                     <input type="time" value={s.start_time || ''} onChange={e => { const newS = [...schedule]; newS[idx].start_time = e.target.value; setSchedule(newS); }} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm outline-none" />
                     <span>-</span>
                     <input type="time" value={s.end_time || ''} onChange={e => { const newS = [...schedule]; newS[idx].end_time = e.target.value; setSchedule(newS); }} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm outline-none" />
                     <button onClick={() => saveSchedule(idx)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 transition-colors"><Save className="w-4 h-4" /></button>
                  </div>
               ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
