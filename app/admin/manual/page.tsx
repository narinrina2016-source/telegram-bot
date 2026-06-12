'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { applyOrg, getOrgSlug } from '@/lib/org-client';
import { Loader2, CheckCircle2, AlertTriangle, Keyboard, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminManualCheck() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      const { data } = await applyOrg(supabase.from('employees').select('*')).eq('active', true).order('name', { ascending: true }).limit(999);
      if (data) {
         setEmployees(data);
      }
      setLoading(false);
    };

    fetchEmployees();
  }, []);

  const handleManualRecord = async (checkType: 'in' | 'out') => {
    if (!selectedEmp) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { error } = await applyOrg(supabase.from('attendance')).insert({
        org_id: getOrgSlug(),
        employee_code: selectedEmp.employee_code,
        method: 'manual',
        check_type: checkType,
        substitute_for: null
      });

      if (error) {
        throw new Error(error.message || 'Supabase insert failed');
      }

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           employeeId: selectedEmp.employee_code, 
           employeeName: selectedEmp.name,
           telegramId: selectedEmp.telegram_id,
           method: 'manual',
           checkType, 
        })
      });
      
      setFeedback({ type: 'success', message: `Successfully recorded ${checkType.toUpperCase()} for ${selectedEmp.name}.` });
      setSelectedEmp(null);
    } catch (err: any) {
       setFeedback({ type: 'error', message: err.message || 'Network error' });
    }
    
    setIsSubmitting(false);
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Manual Entry</h1>
            <p className="text-slate-500 mt-1">Record attendance for employees manually (e.g. forgot phone/card).</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200">
           {loading ? (
             <div className="flex justify-center py-10">
               <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
             </div>
           ) : (
             <div className="flex flex-col md:flex-row gap-10">
                {/* Employee List */}
                <div className="flex-1">
                   <h2 className="text-lg font-bold text-slate-800 mb-4">Select Employee</h2>
                   <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto">
                     {employees.map(emp => (
                       <button
                         key={emp.id}
                         onClick={() => setSelectedEmp(emp)}
                         className={`w-full flex items-center justify-between p-4 border-b border-slate-100 transition-colors last:border-0 ${
                           selectedEmp?.id === emp.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent text-left'
                         }`}
                       >
                         <div>
                            <div className="font-bold text-slate-800">{emp.name}</div>
                            <div className="text-sm font-mono text-slate-500">{emp.employee_code}</div>
                         </div>
                         <User className={`w-5 h-5 ${selectedEmp?.id === emp.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                       </button>
                     ))}
                   </div>
                </div>

                {/* Actions */}
                <div className="flex-1 flex flex-col pt-10 md:pt-0">
                   <h2 className="text-lg font-bold text-slate-800 mb-4">Record Attendance</h2>

                   {feedback && (
                     <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${
                       feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                     }`}>
                       {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 mt-0.5 text-rose-600" />}
                       <p className="font-medium">{feedback.message}</p>
                     </div>
                   )}
                   
                   {selectedEmp ? (
                     <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col h-full animate-in fade-in slide-in-from-right-4">
                       <div className="mb-8">
                         <div className="text-sm text-slate-500 font-medium mb-1">Selected Employee</div>
                         <div className="text-2xl font-bold text-slate-800">{selectedEmp.name}</div>
                         <div className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-2">
                           {selectedEmp.employee_code}
                         </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mt-auto">
                         <button
                           onClick={() => handleManualRecord('in')}
                           disabled={isSubmitting}
                           className="flex flex-col items-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl font-bold transition-colors disabled:opacity-50"
                         >
                           <Clock className="w-6 h-6" />
                           CHECK IN
                         </button>
                         <button
                           onClick={() => handleManualRecord('out')}
                           disabled={isSubmitting}
                           className="flex flex-col items-center gap-2 p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl font-bold transition-colors disabled:opacity-50"
                         >
                           <Clock className="w-6 h-6" />
                           CHECK OUT
                         </button>
                       </div>
                       {isSubmitting && (
                         <div className="flex justify-center mt-4">
                           <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="bg-slate-50 border border-slate-100 border-dashed rounded-2xl flex flex-col items-center justify-center p-10 h-full text-slate-400">
                       <Keyboard className="w-12 h-12 mb-4 text-slate-300" />
                       <p className="text-center">Select an employee from the list to manually record their attendance.</p>
                     </div>
                   )}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
