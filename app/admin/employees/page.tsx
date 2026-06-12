'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { applyOrg, getOrgSlug } from '@/lib/org-client';
import { Users, Plus, Pencil, Trash2, Search, Loader2, FileUp, Download, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rlsError, setRlsError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Ensure data is an array
        if (Array.isArray(data)) {
          for (const row of data as any[]) {
            if (row.employee_code && row.name) {
               await applyOrg(supabase.from('employees')).upsert({
                 org_id: getOrgSlug(),
                 employee_code: row.employee_code,
                 name: row.name,
                 department: row.department || '',
                 payroll_type: row.payroll_type || 'monthly',
                 base_salary: row.base_salary || 0,
                 hourly_rate: row.hourly_rate || 0
               }, { onConflict: 'employee_code' });
            }
          }
          fetchEmployees();
          alert('Import completed!');
        }
      } catch (err) {
        console.error(err);
        alert('Error importing file');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { employee_code: 'EMP999', name: 'Sample User', department: 'Sales', payroll_type: 'monthly', base_salary: 500, hourly_rate: 0 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees Template");
    XLSX.writeFile(wb, "employees_template.xlsx");
  };
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    department: '',
    telegram_id: '',
    payroll_type: 'monthly',
    base_salary: 0,
    hourly_rate: 0
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await applyOrg(supabase
        .from('employees')
        .select('*'))
        .order('created_at', { ascending: false })
        .range(0, 999);
        
      if (data) {
        setEmployees(data);
      } else {
        // Fallback for mocked local dev if Supabase is empty/failing
        setEmployees([{ id: 'mock1', employee_code: 'EMP001', name: 'Narin Rina', department: 'Engineering', active: true }]);
      }
    } catch (e) {
      console.error(e);
      setEmployees([{ id: 'mock1', employee_code: 'EMP001', name: 'Narin Rina', department: 'Engineering', active: true }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openForm = (emp?: any) => {
    if (emp) {
      setEditingId(emp.id);
      setFormData({
        employee_code: emp.employee_code || '',
        name: emp.name || '',
        department: emp.department || '',
        telegram_id: emp.telegram_id || '',
        payroll_type: emp.payroll_type || 'monthly',
        base_salary: emp.base_salary || 0,
        hourly_rate: emp.hourly_rate || 0
      });
    } else {
      setEditingId(null);
      setFormData({ employee_code: '', name: '', department: '', telegram_id: '', payroll_type: 'monthly', base_salary: 0, hourly_rate: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId && editingId !== 'mock1') {
        const { error } = await applyOrg(supabase.from('employees')).update(formData).eq('id', editingId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('employees').insert({ ...formData, org_id: getOrgSlug() });
        if (error) throw new Error(error.message);
      }
      setIsModalOpen(false);
      fetchEmployees();
      setRlsError(null);
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.toLowerCase().includes('row-level security') || err.message.toLowerCase().includes('rls') || err.message.toLowerCase().includes('policy'))) {
        setRlsError(err.message);
      } else {
        alert('Error saving employee: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      if (id !== 'mock1') {
         const { error } = await applyOrg(supabase.from('employees')).delete().eq('id', id);
         if (error) throw new Error(error.message);
      }
      fetchEmployees();
    } catch (err: any) {
      console.error(err);
      alert('Error deleting employee: ' + (err.message || 'Unknown error'));
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    if (id === 'mock1') return;
    try {
      const { error } = await applyOrg(supabase.from('employees')).update({ active: !current }).eq('id', id);
      if (error) throw new Error(error.message);
      fetchEmployees();
    } catch (err: any) {
      console.error(err);
      alert('Error toggling status: ' + (err.message || 'Unknown error'));
    }
  };

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Employees</h1>
          <p className="text-slate-500 mt-2">Manage employee records and access.</p>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <input type="file" accept=".xlsx" onChange={handleExcelImport} className="hidden" ref={fileInputRef} />
          
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">
            <Download className="w-5 h-5" />
            Template
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors">
            <FileUp className="w-5 h-5" />
            Import (.xlsx)
          </button>

          <button 
            onClick={() => openForm()}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </button>
        </div>
      </div>

      {rlsError && (
        <div className="mb-6 p-6 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm text-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 rounded-xl text-rose-800 shrink-0">
              <Settings className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-4 w-full">
              <div>
                <h3 className="text-lg font-bold text-rose-900">
                  🔒 Row-Level Security (RLS) Policy Error Detected / រកឃើញបញ្ហាសេរីភាពសុវត្ថិភាព RLS
                </h3>
                <p className="text-slate-600 mt-1 text-sm leading-relaxed">
                  Your Supabase <strong>employees</strong> table has Row-Level Security enabled, which prevents our application from inserting new employee records.
                  <br />
                  តារាង Supabase <strong>employees</strong> របស់លោកអ្នកត្រូវបានបើក RLS ហេតុនេះហើយមិនអាចឱ្យប្រព័ន្ធបញ្ចូលបុគ្គលិកថ្មីបានទេ។
                </p>
              </div>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 relative group">
                <div className="absolute right-3 top-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE face_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes DISABLE ROW LEVEL SECURITY;`);
                      alert('SQL copied to clipboard!');
                    }}
                    className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-emerald-400 font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    COPY SQL
                  </button>
                </div>
                <pre>{`-- Run this in your Supabase SQL Editor to fix / ដំណើរការកូដនេះក្នុង SQL Editor របស់ Supabase:
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE face_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes DISABLE ROW LEVEL SECURITY;`}</pre>
              </div>

              <div className="text-xs text-rose-800 flex flex-col gap-1 list-none leading-relaxed">
                <li><strong>📍 How to run this:</strong> Web Dashboard of Supabase &gt; Project &gt; SQL Editor (left sidebar) &gt; New Query &gt; Paste SQL and click <strong>Run</strong>!</li>
                <li><strong>📍 របៀបកំណត់៖</strong> ចូលទៅកាន់ Supabase Web Dashboard &gt; ជ្រើសរើស Project &gt; យក SQL Editor (ម៉ឺនុយចំហៀងខាងឆ្វេង) &gt; បង្កើត New Query &gt; ផាសកូដខាងលើ រួចចុច <strong>Run</strong></li>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <th className="p-4 hidden sm:table-cell">Department</th>
                  <th className="p-4 hidden md:table-cell">Telegram ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                          {emp.name.substring(0, 2)}
                       </div>
                       {emp.name}
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-sm">{emp.employee_code}</td>
                    <td className="p-4 text-slate-600 hidden sm:table-cell">{emp.department || '-'}</td>
                    <td className="p-4 text-slate-600 hidden md:table-cell">{emp.telegram_id || '-'}</td>
                    <td className="p-4">
                      <button 
                         onClick={() => toggleActive(emp.id, emp.active)}
                         className={`px-3 py-1 rounded-full text-xs font-semibold ${emp.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                         {emp.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                       <button onClick={() => openForm(emp)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDelete(emp.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
             <h2 className="text-xl font-bold text-slate-800 mb-4">
               {editingId ? 'Edit Employee' : 'New Employee'}
             </h2>
             <form onSubmit={handleSave} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID / Code *</label>
                 <input required type="text" value={formData.employee_code} onChange={e => setFormData({...formData, employee_code: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="EMP001" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                 <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="John Doe" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                 <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. Sales" />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Payroll Type</label>
                   <select value={formData.payroll_type} onChange={e => setFormData({...formData, payroll_type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none">
                     <option value="monthly">Monthly</option>
                     <option value="hourly">Hourly</option>
                   </select>
                 </div>
                 {formData.payroll_type === 'monthly' ? (
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary ($)</label>
                     <input type="number" step="any" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                 ) : (
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate ($)</label>
                     <input type="number" step="any" value={formData.hourly_rate} onChange={e => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" />
                   </div>
                 )}
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Telegram ID (Optional)</label>
                 <input type="text" value={formData.telegram_id} onChange={e => setFormData({...formData, telegram_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="12345678" />
                 <p className="text-xs text-slate-500 mt-1">Can be left empty for users to link via Bot later.</p>
               </div>

               <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">
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
