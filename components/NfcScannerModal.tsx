'use client';
import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { applyOrg } from '@/lib/org-client';

export default function NfcScannerModal({ 
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
  const [wedgeInput, setWedgeInput] = useState('');

  const handleClose = () => {
    setScanState('scanning');
    setErrorMessage('');
    setWedgeInput('');
    onClose();
  };

  const processNfcSerial = async (serial: string) => {
    setScanState('scanning');
    
    // Normalize serial? Usually comes as 04:xx:.. or as an integer from some wedge readers
    // Let's do a strict match first
    const { data } = await applyOrg(supabase.from('employees').select('employee_code')).eq('nfc_serial', serial).single();
    
    if (data) {
       setScanState('success');
       setTimeout(() => {
         onSuccess(data.employee_code);
         handleClose();
       }, 1500);
    } else {
       setScanState('error');
       setErrorMessage('កាតមិនស្គាល់ (Unknown Card: ' + serial + ').');
       setTimeout(() => setScanState('scanning'), 3000);
    }
  };

  // Handle Web NFC if available
  useEffect(() => {
    if (!isOpen || scanState !== 'scanning') return;
    
    let ndef: any = null;
    let abortController = new AbortController();

    const startNfc = async () => {
      // @ts-ignore
      if ('NDEFReader' in window) {
        try {
          // @ts-ignore
          ndef = new NDEFReader();
          await ndef.scan({ signal: abortController.signal });
          ndef.addEventListener("reading", async ({ serialNumber }: any) => {
             if (serialNumber) {
               await processNfcSerial(serialNumber);
             }
          });
          ndef.addEventListener("readingerror", () => {
             setScanState('error');
             setErrorMessage('Error reading NFC tag. Try again.');
             setTimeout(() => setScanState('scanning'), 3000);
          });
        } catch (error) {
          // No NFC hardware or permissions usually
          console.warn("NFC Error", error);
        }
      }
    };
    
    startNfc();
    return () => {
       abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scanState]);

  // Handle USB reader wedge (acting as a keyboard)
  useEffect(() => {
    if (!isOpen || scanState !== 'scanning') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
         if (wedgeInput.length > 3) {
            processNfcSerial(wedgeInput);
         }
         setWedgeInput('');
      } else if (e.key.length === 1) { // Normal character
         setWedgeInput(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scanState, wedgeInput]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative"
        role="dialog"
      >
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">ស្កេនកាត NFC</h2>
              <p className="text-white/80 text-sm">Tap NFC ID Card</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center">
          
          <div className="relative w-full max-w-[200px] aspect-square rounded-full overflow-hidden flex items-center justify-center mb-6">
            
            {scanState === 'success' ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-emerald-50 text-emerald-600 animate-in fade-in zoom-in duration-300 rounded-full">
                <CheckCircle2 className="w-20 h-20 mb-2" />
                <p className="font-bold text-lg">ជោគជ័យ!</p>
              </div>
            ) : scanState === 'error' ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-rose-50 text-rose-600 animate-in fade-in zoom-in duration-300 px-4 text-center rounded-full">
                <AlertTriangle className="w-16 h-16 mb-2" />
                <p className="font-medium text-sm">{errorMessage}</p>
              </div>
            ) : (
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute w-full h-full bg-orange-100 rounded-full animate-ping opacity-50"></div>
                  <div className="relative z-10 bg-orange-100 rounded-full w-3/4 h-3/4 flex items-center justify-center border-4 border-orange-200">
                     <CreditCard className="w-16 h-16 text-orange-500" />
                  </div>
               </div>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-slate-800">ដាក់កាតអោយជិតទូរស័ព្ទ / ឧបករណ៍</h3>
          <p className="mt-2 text-slate-500 font-medium text-sm">
            (Tap your card near the device)
          </p>
          <p className="mt-4 text-[10px] text-slate-400">
            Supports Web NFC (Android) & USB RFID Readers.
          </p>
        </div>
      </div>
    </div>
  );
}
