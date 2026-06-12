'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchOrgSettings, saveOrgSettings } from '@/lib/org-settings';
import { MapPin, Save, Loader2, RefreshCw } from 'lucide-react';

export default function AdminSystem() {
  const [gpsLink, setGpsLink] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('50');
  const [workStartTime, setWorkStartTime] = useState('08:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [message, setMessage] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { settings } = await fetchOrgSettings();
      if (settings.office_lat) setLat(settings.office_lat);
      if (settings.office_lng) setLng(settings.office_lng);
      if (settings.office_radius) setRadius(settings.office_radius);
      if (settings.work_start_time) setWorkStartTime(settings.work_start_time);
      if (settings.work_end_time) setWorkEndTime(settings.work_end_time);
    } catch (e) {
      console.error(e);
      // Fallback
      if (localStorage.getItem('office_lat')) setLat(localStorage.getItem('office_lat') || '');
      if (localStorage.getItem('office_lng')) setLng(localStorage.getItem('office_lng') || '');
      if (localStorage.getItem('office_radius')) setRadius(localStorage.getItem('office_radius') || '50');
      if (localStorage.getItem('work_start_time')) setWorkStartTime(localStorage.getItem('work_start_time') || '08:00');
      if (localStorage.getItem('work_end_time')) setWorkEndTime(localStorage.getItem('work_end_time') || '17:00');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const newSettings = {
        office_lat: lat,
        office_lng: lng,
        office_radius: radius,
        work_start_time: workStartTime,
        work_end_time: workEndTime
      };
      
      const { settings: currentSettings } = await fetchOrgSettings();
      await saveOrgSettings({ ...currentSettings, ...newSettings });
        
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
       console.error(e);
       setMessage('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGpsLink(val);
    
    // Attempt to parse google maps link
    setParsing(true);
    try {
      // Very basic URL regex for coords: @lat,lng,
      const match = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        setLat(match[1]);
        setLng(match[2]);
      } else {
        // another format: q=lat,lng
        const match2 = val.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match2) {
          setLat(match2[1]);
          setLng(match2[2]);
        }
      }
    } catch (err) {}
    setParsing(false);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setParsing(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toString());
          setLng(position.coords.longitude.toString());
          setParsing(false);
        },
        (error) => {
          console.error("Error getting location", error);
          setParsing(false);
          alert("Failed to get current location");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">System Settings</h1>
        <p className="text-slate-500 mt-2">Configure office location and general system parameters.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
           <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
             <MapPin className="w-6 h-6" />
           </div>
           <h2 className="text-xl font-bold text-slate-800">Office Location</h2>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Left Col */}
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Paste Google Maps Link</label>
                   <input 
                     type="text" 
                     value={gpsLink}
                     onChange={handleLinkPaste}
                     placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/..."
                     className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                   />
                   <p className="text-xs text-slate-500 mt-1">We will try to extract coordinates automatically.</p>
                </div>
                
                <div className="flex items-center justify-between">
                   <div className="h-px bg-slate-200 flex-1"></div>
                   <span className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">or</span>
                   <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <button 
                  onClick={getCurrentLocation}
                  disabled={parsing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors border border-slate-200"
                >
                  {parsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  Use Current GPS Location
                </button>
             </div>

             {/* Right Col */}
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                    <input 
                      type="number" 
                      step="any" 
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Radius (meters)</label>
                  <input 
                    type="number" 
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Acceptable distance for GPS check-in.</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mt-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
           <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
             <Save className="w-6 h-6" /> {/* Replace MapPin icon as needed */}
           </div>
           <h2 className="text-xl font-bold text-slate-800">Work Hours Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Standard Check-In Time</label>
            <input 
              type="time" 
              value={workStartTime}
              onChange={(e) => setWorkStartTime(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Standard Check-Out Time</label>
            <input 
              type="time" 
              value={workEndTime}
              onChange={(e) => setWorkEndTime(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
        <div>
          {message && (
            <span className={`text-sm font-medium ${message.includes('success') ? 'text-emerald-600' : 'text-rose-600'}`}>
              {message}
            </span>
          )}
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}
