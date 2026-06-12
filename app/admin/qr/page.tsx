'use client';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';
import { fetchOrgSettings, saveOrgSettings } from '@/lib/org-settings';
import { Loader2, Download, RefreshCw, Printer, ShieldCheck } from 'lucide-react';

export default function AdminQr() {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateNewSecret = async () => {
    setLoading(true);
    const newSecret = "OFFICE_QR_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    try {
      const { settings } = await fetchOrgSettings();
      await saveOrgSettings({ ...settings, active_office_qr: newSecret });
      
      setSecret(newSecret);
      const url = await QRCode.toDataURL(newSecret, {
        width: 400,
        margin: 2,
        color: {
          dark: '#312e81',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchExistingOrGenerate = async () => {
      let existingSecret = localStorage.getItem('active_office_qr');
      
      try {
        const { settings } = await fetchOrgSettings();
        if (settings.active_office_qr) {
          existingSecret = settings.active_office_qr;
        }
      } catch (err) {
        // ignore
      }

      if (existingSecret) {
        setSecret(existingSecret);
        const url = await QRCode.toDataURL(existingSecret, {
          width: 400, margin: 2, color: { dark: '#312e81', light: '#ffffff' }
        });
        setQrCodeDataUrl(url);
      } else {
        generateNewSecret();
      }
    };
    
    fetchExistingOrGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `Office_QR_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!qrCodeDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Print Office QR</title>
            <style>
              body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
              img { width: 400px; height: 400px; }
              h1 { color: #312e81; margin-bottom: 24px; }
            </style>
          </head>
          <body>
            <h1>Office Scan to Check In</h1>
            <img src="${qrCodeDataUrl}" />
            <p style="margin-top:24px; color:#6b7280; text-align:center;">Please use your SecureAttend application to scan this QR code.</p>
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-8">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-xl shadow-indigo-900/5 border border-slate-200 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Office QR Admin</h1>
        <p className="text-slate-500 mb-8 font-medium">Generate or print the QR code for office check-ins.</p>

        {loading ? (
          <div className="flex justify-center items-center h-[400px] bg-slate-50 rounded-2xl border border-slate-100">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {qrCodeDataUrl ? (
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-8 inline-block shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeDataUrl} alt="Office QR Code" className="w-[300px] h-[300px] rounded-xl mix-blend-multiply" />
              </div>
            ) : (
              <div className="w-[300px] h-[300px] bg-slate-100 rounded-3xl mb-8 flex items-center justify-center border-2 border-dashed border-slate-300">
                <span className="text-slate-400">No QR Generated</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
              <button 
                onClick={generateNewSecret}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium transition-colors"
                title="Regenerate QR"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
              
              <button 
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors border border-slate-200"
                title="Download PNG"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Download</span>
              </button>
              
              <button 
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors border border-slate-200 col-span-2 lg:col-span-1"
                title="Print QR Code"
              >
                <Printer className="w-5 h-5" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
            
            <p className="mt-8 text-xs text-slate-400 max-w-[280px] break-all bg-slate-100 p-2 rounded-lg">
              Active Secret: {secret}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
