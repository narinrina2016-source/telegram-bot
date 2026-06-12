'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, X, Camera, ScanFace, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function FaceRegistrationModal({ 
  isOpen, 
  onClose,
  employeeId = 'mock-employee-id'
}: { 
  isOpen: boolean; 
  onClose: () => void;
  employeeId?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [fallbackImageSrc, setFallbackImageSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setErrorMsg('មិនអាចបើកកាមេរ៉ាបានទេ (Cannot access camera). You can upload a photo instead.');
        setCameraFailed(true);
      }
    }

    async function loadModels() {
      setLoadingModels(true);
      try {
        const faceapi = await import('@vladmandic/face-api');
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setLoadingModels(false);
      } catch (err) {
        console.error('Model loading error:', err);
        setErrorMsg('មិនអាចទាញយកទិន្នន័យ (Failed to load face models).');
        setLoadingModels(false);
      }
    }

    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuccess(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMsg(null);
      loadModels().then(setupCamera);
    }

    const currentVideoRef = videoRef.current;
    return () => {
      if (currentVideoRef && currentVideoRef.srcObject) {
        const s = currentVideoRef.srcObject as MediaStream;
        s.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const handleCapture = async () => {
    const inputElement = cameraFailed ? imageRef.current : videoRef.current;
    if (!inputElement) return;
    
    // For video, we want readyState 4, For images complete true.
    if (!cameraFailed && (inputElement as HTMLVideoElement).readyState !== 4) return;
    if (cameraFailed && !(inputElement as HTMLImageElement).complete) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const faceapi = await import('@vladmandic/face-api');
      
      if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
        throw new Error('ប្រព័ន្ធមិនទាន់រួចរាល់ទេ (Models not fully loaded).');
      }

      const detection = await faceapi
        .detectSingleFace(inputElement)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error('រកមិនឃើញមុខទេ សូមសាកល្បងម្ដងទៀត (No face detected. Please try again).');
      }

      const descriptorArray = Array.from(detection.descriptor);
      
      // Store in localStorage
      localStorage.setItem(`face_enrollment_${employeeId}`, JSON.stringify(descriptorArray));

      // Attempt to store in Supabase
      try {
        const { error } = await supabase
          .from('employees')
          .update({ face_descriptor: JSON.stringify(descriptorArray) })
          .eq('employee_code', employeeId);
          
        if (error) {
           console.warn('Supabase update failed, relying on localStorage', error);
        }
      } catch (dbErr) {
        console.warn('Supabase DB not configured, falling back to local.', dbErr);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យ (Capture failed).');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
               <ScanFace className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-800">ចុះឈ្មោះផ្ទៃមុខ</h3>
               <p className="text-xs text-slate-500 font-medium">Face Registration</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 items-center">
          
          {loadingModels ? (
            <div className="h-64 bg-slate-50 rounded-2xl w-full flex flex-col justify-center items-center gap-3 border border-slate-100">
               <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
               <p className="text-slate-500 font-medium text-sm">កំពុងរៀបចំប្រព័ន្ធ... (Loading AI Models)</p>
            </div>
          ) : success ? (
            <div className="h-64 bg-emerald-50 rounded-2xl w-full flex flex-col justify-center items-center gap-4 border border-emerald-100 p-6 text-center">
               <CheckCircle2 className="w-16 h-16 text-emerald-500" />
               <p className="text-emerald-700 font-bold text-lg">ចុះឈ្មោះដោយជោគជ័យ!</p>
               <p className="text-emerald-600/80 text-sm">Registration Complete</p>
            </div>
          ) : (
            <div className="relative w-full aspect-[3/4] sm:aspect-square bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200">
              {cameraFailed ? (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="absolute inset-0 z-20 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFallbackImageSrc(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {fallbackImageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      ref={imageRef} 
                      src={fallbackImageSrc} 
                      alt="Fallback upload" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium">
                       Tap to upload photo
                    </div>
                  )}
                </>
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              )}
              {/* Overlay guidelines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-white/50 rounded-full" />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="w-full p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {!loadingModels && !success && (
            <button 
              onClick={handleCapture}
              disabled={loading || (cameraFailed && !fallbackImageSrc)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              {loading ? 'កំពុងដំណើរការ...' : 'ចាប់យករូបភាព (Capture Face)'}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
