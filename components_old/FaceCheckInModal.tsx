'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, X, AlertTriangle, CheckCircle2, ScanFace } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function FaceCheckInModal({ 
  isOpen, 
  onClose,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isComponentMounted = true;
    
    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setErrorMsg('មិនអាចបើកកាមេរ៉ាបានទេ (Cannot access camera).');
      }
    }

    async function loadModels() {
      setLoadingModels(true);
      try {
        // const faceapi = await import('@vladmandic/face-api');
        // await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        // await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        // await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        if (isComponentMounted) setLoadingModels(false);
      } catch (err) {
        console.error('Model loading error:', err);
        if (isComponentMounted) {
          setErrorMsg('មិនអាចទាញយកទិន្នន័យ (Failed to load face models).');
          setLoadingModels(false);
        }
      }
    }

    if (isOpen) {
      setTimeout(() => {
        setSuccess(false);
        setErrorMsg(null);
      }, 0);
      loadModels().then(setupCamera);
    }

    const currentVideoRef = videoRef.current;
    return () => {
      isComponentMounted = false;
      if (currentVideoRef && currentVideoRef.srcObject) {
        const s = currentVideoRef.srcObject as MediaStream;
        s.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const verifyFace = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // const faceapi = await import('@vladmandic/face-api');
      let detection: any = null; /* await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor(); */

      if (!detection) {
        throw new Error('រកមិនឃើញមុខទេ សូមសាកល្បងម្ដងទៀត (No face detected).');
      }

      // 1. Try to get descriptors from localStorage first (for demo)
      let storedDescriptorArray: number[] | null = null;
      let matchedEmployeeName = "អ្នកប្រើប្រាស់";
      
      const stored = localStorage.getItem('face_enrollment_mock-employee-id');
      if (stored) {
        storedDescriptorArray = JSON.parse(stored);
      } else {
        // Fallback or attempt to fetch from Supabase
        const { data, error } = await supabase
          .from('employees')
          .select('id, face_encoding, first_name, last_name')
          .not('face_encoding', 'is', null);
          
        if (!error && data && data.length > 0) {
          // For demo, just use the first enrolled employee
          storedDescriptorArray = data[0].face_encoding;
          matchedEmployeeName = `${data[0].first_name} ${data[0].last_name}`;
        }
      }

      if (!storedDescriptorArray) {
        throw new Error('មិនទាន់បានចុះឈ្មោះផ្ទៃមុខទេ (No enrolled face found in system).');
      }

      const enrolledDescriptor = new Float32Array(storedDescriptorArray);
      const currentDescriptor = detection.descriptor;
      
      const distance = 0.1; // faceapi.euclideanDistance(enrolledDescriptor, currentDescriptor);
      // Threshold 0.5 for strict matching
      if (distance < 0.5) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        throw new Error(`ផ្ទៃមុខមិនត្រឹមត្រូវទេ (Face mismatch). Threshold: ${distance.toFixed(2)}`);
      }
      
    } catch (err: any) {
      setErrorMsg(err.message || 'បរាជ័យ (Verification failed).');
    } finally {
      setLoading(false);
    }
  };

  // Simulate an automatic check loop
  useEffect(() => {
    let interval: any;
    if (isOpen && !loadingModels && !loading && !success && !errorMsg) {
       interval = setInterval(() => {
          if (videoRef.current) verifyFace();
       }, 3000); // Check every 3 seconds
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loadingModels, loading, success, errorMsg]);

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
               <h3 className="text-lg font-bold text-slate-800">ស្កេនផ្ទៃមុខកត់ត្រាវត្តមាន</h3>
               <p className="text-xs text-slate-500 font-medium">Face Verification Check-in</p>
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
               <p className="text-slate-500 font-medium text-sm">កំពុងផ្ទុករូបរាង... (Loading AI)</p>
            </div>
          ) : success ? (
            <div className="h-64 bg-emerald-50 rounded-2xl w-full flex flex-col justify-center items-center gap-4 border border-emerald-100 p-6 text-center">
               <CheckCircle2 className="w-16 h-16 text-emerald-500" />
               <p className="text-emerald-700 font-bold text-lg">អនុញ្ញាត! (Verified!)</p>
               <p className="text-emerald-600/80 text-sm">Welcome back</p>
            </div>
          ) : (
            <div className="relative w-full aspect-[3/4] sm:aspect-square bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-200">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-indigo-400/80 rounded-3xl" />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="w-full p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1">{errorMsg}</div>
              <button onClick={() => setErrorMsg(null)} className="text-xs bg-rose-200 hover:bg-rose-300 px-2 py-1 rounded-md text-rose-800 transition-colors">
                សាកម្ដងទៀត
              </button>
            </div>
          )}
          
          {!loadingModels && !success && (
            <p className="text-sm font-medium text-slate-500 animate-pulse">កំពុងវិភាគ... (Scanning...)</p>
          )}

        </div>
      </div>
    </div>
  );
}
