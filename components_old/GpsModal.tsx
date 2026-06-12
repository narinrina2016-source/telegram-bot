'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getDistance } from '@/lib/geo';
import { Loader2, X, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400">កំពុងផ្ទុកផែនទី (Loading Map)...</div>
});

const OFFICE_LOCATION: [number, number] = [11.5761, 104.9230]; // Wat Phnom, Phnom Penh
const ALLOWED_RADIUS = 50; // meters

export default function GpsModal({ 
  isOpen, 
  onClose,
  onCheckIn,
  onCheckOut
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMsg(null);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            const dist = getDistance(latitude, longitude, OFFICE_LOCATION[0], OFFICE_LOCATION[1]);
            setDistance(dist);
            setLoading(false);
          },
          (err) => {
            console.error(err);
            setErrorMsg('មិនអាចទាញយកទីតាំងបានទេ (Cannot get location). Please enable GPS.');
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setErrorMsg('Geolocation is not supported by your browser.');
        setLoading(false);
      }
    } else {
       // Reset state on close
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setUserLocation(null);
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setDistance(null);
       // eslint-disable-next-line react-hooks/set-state-in-effect
       setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isWithinZone = distance !== null && distance <= ALLOWED_RADIUS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
               <MapPin className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-800">ស្កេនទីតាំង GPS</h3>
               <p className="text-xs text-slate-500 font-medium">Location Verification</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
           
           {loading ? (
             <div className="h-[300px] bg-slate-50 rounded-2xl flex flex-col justify-center items-center gap-3 border border-slate-100">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-slate-500 font-medium text-sm">កំពុងស្វែងរកទីតាំងរបស់អ្នក...</p>
             </div>
           ) : errorMsg ? (
             <div className="h-[300px] bg-rose-50 rounded-2xl flex flex-col justify-center items-center gap-3 border border-rose-100 p-6 text-center">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
                <p className="text-rose-700 font-medium">{errorMsg}</p>
             </div>
           ) : (
             <div className="relative">
                <MapComponent officeLocation={OFFICE_LOCATION} userLocation={userLocation} radius={ALLOWED_RADIUS} />
                
                {/* Status Overlay */}
                {distance !== null && (
                  <div className={`absolute bottom-4 left-4 right-4 z-[400] p-3 rounded-xl shadow-lg border backdrop-blur-md flex items-center justify-between ${
                    isWithinZone 
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50/90 border-rose-200 text-rose-800'
                  }`}>
                    <div className="flex items-center gap-2">
                       {isWithinZone ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                       <span className="font-semibold text-sm">
                         {isWithinZone ? 'ក្នុងតំបន់អនុញ្ញាត (Within Zone)' : 'នៅក្រៅតំបន់ (Outside Zone)'}
                       </span>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold opacity-80">{distance.toFixed(0)} ម៉ែត្រ (m)</p>
                    </div>
                  </div>
                )}
             </div>
           )}

           <div className="grid grid-cols-2 gap-3 mt-2">
              <button 
                onClick={() => { onCheckIn(); onClose(); }}
                disabled={loading || !isWithinZone}
                className="py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
              >
                 ចូលធ្វើការ (CHECK IN)
              </button>
              <button 
                onClick={() => { onCheckOut(); onClose(); }}
                disabled={loading || !isWithinZone}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
              >
                 ចេញពីធ្វើការ (CHECK OUT)
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}
