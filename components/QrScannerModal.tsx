'use client';
import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, CheckCircle2, AlertTriangle, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function QrScannerModal({ 
  isOpen, 
  onClose,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: (empCode?: string) => void;
}) {
  const [scanState, setScanState] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleDecode = async (result: string) => {
    if (scanState !== 'scanning') return;
    setScanState('scanning');
    
    // Check against active secret. In real prod, this is done via a secure backend.
    // Here we check against the `office_settings` table (or localStorage).
    let validSecret = localStorage.getItem('active_office_qr');
    
    try {
      const { data, error } = await supabase
        .from('office_settings')
        .select('setting_value')
        .eq('setting_key', 'active_office_qr')
        .single();
        
      if (data?.setting_value) {
        validSecret = data.setting_value;
      }
    } catch (e) {
      // ignore, fallback to local
    }

    if (result.startsWith('SECATT-EMP:')) {
      const parts = result.split(':');
      if (parts.length === 3) {
        const empCode = parts[1];
        const hash = parts[2];
        const cryptoContent = empCode + (validSecret || '');
        
        // Simple hash verify if subtle crypto is available. 
        // For sync simplicity, we can fetch an api or we can use the same logic if we extract crypto!
        // But we import it!
        import('@/lib/crypto').then(async ({ sha256 }) => {
           const computed = await sha256(cryptoContent);
           if (computed === hash) {
             setScanState('success');
             setTimeout(() => {
               onSuccess(empCode);
               handleClose();
             }, 1500);
           } else {
             setScanState('error');
             setErrorMessage('កាតមិនត្រឹមត្រូវ (Invalid ID Card Signature).');
             setTimeout(() => setScanState('scanning'), 3000);
           }
        });
        return;
      }
    }

    if (result === validSecret) {
      setScanState('success');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } else {
      setScanState('error');
      setErrorMessage('លេខកូដមិនត្រឹមត្រូវ រឺផុតកំណត់ (Invalid or expired QR code).');
      setTimeout(() => setScanState('scanning'), 3000); // retry after 3s
    }
  };

  const handleClose = () => {
    setScanState('scanning');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative"
        role="dialog"
        aria-modal="true"
      >
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 bg-gradient-brand text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">ស្កេនកូដ QR</h2>
              <p className="text-white/80 text-sm">Scan Office QR Code</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 flex flex-col items-center justify-center">
          
          <div className="relative w-full max-w-[280px] aspect-square rounded-3xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100 flex items-center justify-center">
            
            {scanState === 'success' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-emerald-50 text-emerald-600 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-16 h-16 mb-2" />
                <p className="font-semibold text-lg">ជោគជ័យ (Success)!</p>
              </div>
            )}
            
            {scanState === 'error' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-rose-50 text-rose-600 animate-in fade-in zoom-in duration-300 px-4 text-center">
                <AlertTriangle className="w-12 h-12 mb-2" />
                <p className="font-medium">{errorMessage}</p>
              </div>
            )}

            {(scanState === 'scanning' || scanState === 'error') && (
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                     handleDecode(result[0].rawValue);
                  }
                }}
                components={{ audio: false }}
              />
            )}
            
            {/* Scanner overlay decorations */}
            <div className="absolute inset-4 z-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
            </div>
          </div>
          
          <p className="mt-6 text-center text-slate-500 font-medium text-sm">
            សូមដាក់កាមេរ៉ារបស់អ្នកទៅចំកូដ QR តាំងនៅការិយាល័យ
            <br className="mb-1" />
            (Align the camera with the Office QR Code)
          </p>
          
        </div>
      </div>
    </div>
  );
}
