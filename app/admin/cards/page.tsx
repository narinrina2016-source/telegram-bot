'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { applyOrg, getOrgSlug } from '@/lib/org-client';
import { fetchOrgSettings, saveOrgSettings } from '@/lib/org-settings';
import { Loader2, Printer, Edit2, Check, X, ShieldCheck, CreditCard, ScanLine, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { sha256 } from '@/lib/crypto';
import Image from 'next/image';

export default function AdminCards() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [orgSecret, setOrgSecret] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editNfc, setEditNfc] = useState('');
  const [readingNfc, setReadingNfc] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    const { settings } = await fetchOrgSettings();
    if (settings.active_office_qr) {
       setOrgSecret(settings.active_office_qr); // Use office QR as the secret
    } else {
       // if none exists, generate one
       const newSecret = "SEC_" + Math.random().toString(36).substring(2, 15);
       await saveOrgSettings({ ...settings, active_office_qr: newSecret });
       setOrgSecret(newSecret);
    }

    const { data } = await applyOrg(supabase.from('employees').select('*')).eq('active', true).order('name', { ascending: true }).limit(500);
    if (data) {
       // Compute tokens for QR
       for (let e of data) {
          e.qrToken = await sha256(e.employee_code + (settings.active_office_qr || ''));
          e.qrStr = `SECATT-EMP:${e.employee_code}:${e.qrToken}`;
       }
       setEmployees(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    setTimeout(() => {
      fetchEmployees();
    }, 0);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setEditPhotoUrl(e.photo_url || '');
    setEditNfc(e.nfc_serial || '');
  };

  const saveEdit = async (e: any) => {
    await applyOrg(supabase.from('employees'))
      .update({ photo_url: editPhotoUrl, nfc_serial: editNfc })
      .eq('id', e.id);
    setEditingId(null);
    fetchEmployees();
  };

  const startNfcRead = async () => {
    // @ts-ignore
    if ('NDEFReader' in window) {
      setReadingNfc(true);
      try {
        // @ts-ignore
        const ndef = new NDEFReader();
        await ndef.scan();
        ndef.addEventListener("reading", ({ serialNumber }: any) => {
           setEditNfc(serialNumber || '');
           setReadingNfc(false);
           alert("NFC Read: " + serialNumber);
        });
        ndef.addEventListener("readingerror", () => {
           alert("Error reading NFC tag.");
           setReadingNfc(false);
        });
      } catch (error) {
        console.error(error);
        alert("Web NFC not supported or no permission. You can also manually type the serial number from an external reader.");
        setReadingNfc(false);
      }
    } else {
      alert("Web NFC is not supported in this browser. Please type the serial number manually (USB readers act like a keyboard).");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
           body * { visibility: hidden; }
           #print-area, #print-area * { visibility: visible; }
           #print-area { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
           .no-print { display: none !important; }
           .print-card { page-break-inside: avoid; border: 1px solid #ccc; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        }
      `}} />

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Employee Cards</h1>
            <p className="text-slate-500 mt-1">Generate and print ID cards. Bind NFC and Photos.</p>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
          >
            <Printer className="w-5 h-5" /> Print All Cards
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div id="print-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map(emp => (
              <div key={emp.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 print-card flex flex-col items-center text-center">
                
                {/* Photo */}
                <div className="w-24 h-24 mb-4 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                  {emp.photo_url ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                  ) : (
                     <Camera className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-800">{emp.name}</h3>
                <p className="text-sm font-mono text-slate-500 mb-4">{emp.employee_code}</p>
                <p className="text-xs text-slate-400 mb-4">{emp.department}</p>

                <div className="bg-white p-2 border border-slate-100 rounded-2xl shadow-sm mb-4">
                   <QRCodeSVG value={emp.qrStr} size={120} level="M" />
                </div>
                <p className="text-[10px] text-slate-400 mb-6 font-mono break-all px-4">{emp.qrStr.substring(0, 30)}...</p>

                {/* Edit Controls (No-print) */}
                <div className="w-full no-print pt-4 border-t border-slate-100 text-left">
                  {editingId === emp.id ? (
                   <form onSubmit={(e) => { e.preventDefault(); saveEdit(emp); }} className="space-y-3">
                       <div>
                         <label className="text-xs font-medium text-slate-500">Photo URL</label>
                         <input type="text" value={editPhotoUrl} onChange={e => setEditPhotoUrl(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" placeholder="https://..." />
                       </div>
                       <div>
                         <label className="text-xs font-medium text-slate-500">NFC Serial</label>
                         <div className="flex gap-2">
                           <input type="text" value={editNfc} onChange={e => setEditNfc(e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm font-mono" placeholder="04:A1:..." />
                           <button type="button" onClick={startNfcRead} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors" title="Read Web NFC">
                              {readingNfc ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                           </button>
                         </div>
                       </div>
                       <div className="flex gap-2 justify-end pt-2">
                         <button type="button" onClick={() => setEditingId(null)} className="p-1 text-slate-500 hover:bg-slate-100 rounded text-sm"><X className="w-4 h-4" /></button>
                         <button type="submit" className="p-1 text-emerald-600 hover:bg-emerald-50 rounded text-sm"><Check className="w-4 h-4" /></button>
                       </div>
                     </form>
                  ) : (
                     <div className="flex items-center justify-between">
                       <div className="text-xs text-slate-500">
                          {emp.nfc_serial ? (
                             <span className="flex items-center gap-1 text-emerald-600 font-mono"><CreditCard className="w-3 h-3" /> {emp.nfc_serial}</span>
                          ) : (
                             <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> No NFC</span>
                          )}
                       </div>
                       <button onClick={() => startEdit(emp)} className="flex items-center gap-1 text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">
                          <Edit2 className="w-3 h-3" /> Edit
                       </button>
                     </div>
                  )}
                </div>

              </div>
            ))}
            {employees.length === 0 && (
               <div className="col-span-full py-20 text-center text-slate-500">
                 No employees found. Add employees first to generate cards.
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
