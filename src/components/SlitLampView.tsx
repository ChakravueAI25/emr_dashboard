import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, ChevronLeft, Save, RefreshCw, Upload, FileImage, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { API_ENDPOINTS } from '../config/api';

interface SlitLampViewProps {
  onBack: () => void;
  patientId?: string;
  patientName?: string;
  doctorName?: string;
}

export function SlitLampView({ onBack, patientId, patientName, doctorName }: SlitLampViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [eyeSide, setEyeSide] = useState<'Left' | 'Right' | 'Both'>('Both');

  // Load available cameras
  useEffect(() => {
    async function getDevices() {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    }
    getDevices();
  }, []);

  // Start selected camera
  useEffect(() => {
    if (!selectedDeviceId) return;

    async function startCamera() {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId]);

  // Ensure video plays when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Play error:", e));
    }
  }, [stream]);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const vid = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = vid.videoWidth;
      canvas.height = vid.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(vid, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
      }
    }
  }, []);

  const retake = () => {
    setCapturedImage(null);
  };

  const saveRecord = async () => {
    if (!capturedImage) return;
    if (!patientId) {
      showAlert("No Patient ID found. Cannot save.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        patientId,
        patientName: patientName || "Guest",
        doctorName: doctorName || "Unknown",
        image: capturedImage,
        notes,
        eyeSide
      };

      const res = await fetch(API_ENDPOINTS.SLIT_LAMP_UPLOAD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showAlert("Saved successfully!");
        setCapturedImage(null);
        setNotes('');
      } else {
        showAlert("Failed to save.");
      }
    } catch (e) {
      console.error(e);
      showAlert("Error saving record.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col p-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button onClick={onBack} className="flex items-center justify-center w-10 h-10 p-0 bg-[var(--theme-accent)] text-white force-text-white rounded-full shadow-lg hover:opacity-90 transition-all flex-shrink-0">
             <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white">Slit Lamp Imaging</h2>
            <p className="text-xs text-[#888]">Capture high-definition anterior segment images</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#D4A574]">
                <Settings className="w-4 h-4 text-[#D4A574]" />
                <select 
                  className="bg-transparent text-xs text-white outline-none border-none min-w-[200px]"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}...`}</option>
                  ))}
                </select>
             </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 overflow-hidden min-h-0">
        {/* Main Viewfinder */}
        <div className="bg-black rounded-3xl border border-[#222] overflow-hidden relative flex items-center justify-center group shadow-2xl min-h-[400px]">
           {!capturedImage ? (
             <>
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline
                 muted 
                 className="w-full h-full object-contain bg-black"
               />
               <canvas ref={canvasRef} className="hidden" />
               
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6">
                  <button 
                    onClick={captureImage}
                    className="w-20 h-20 rounded-full border-4 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all group-hover:border-[#D4A574]"
                  >
                     <div className="w-16 h-16 rounded-full bg-white group-hover:bg-[#D4A574] transition-colors shadow-lg"></div>
                  </button>
               </div>
               
               <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/80 backdrop-blur text-white text-[10px] font-bold uppercase tracking-widest rounded-full animate-pulse">
                  Live Feed
               </div>
             </>
           ) : (
             <div className="relative w-full h-full">
               <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
               <div className="absolute top-4 left-4 flex gap-2">
                  <button onClick={retake} className="px-4 py-2 bg-black/60 backdrop-blur text-white text-xs rounded-full border border-white/10 hover:bg-black/80 flex items-center gap-2">
                     <RefreshCw className="w-3 h-3" /> Retake
                  </button>
               </div>
             </div>
           )}
        </div>

        {/* Sidebar Controls */}
        <div className="flex flex-col gap-4 overflow-y-auto">
           {/* Patient Context */}
           <div className="bg-[#111] p-5 rounded-3xl border border-[#222]">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                 <FileImage className="w-4 h-4 text-[#D4A574]" />
                 Context
              </h3>
              
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] uppercase text-[#666] font-bold tracking-wider">Patient ID</label>
                    <div className="text-sm text-white font-mono mt-1">{patientId || 'Not Selected'}</div>
                 </div>
                 
                 <div>
                    <label className="text-[10px] uppercase text-[#666] font-bold tracking-wider mb-2 block">Available Eyes</label>
                    <div className="flex p-1 bg-[#0a0a0a] rounded-xl border border-[#222]">
                       {(['Left', 'Both', 'Right'] as const).map(side => (
                         <button
                           key={side}
                           onClick={() => setEyeSide(side)}
                           className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${
                             eyeSide === side ? 'bg-[#D4A574] text-black shadow-lg' : 'text-[#666] hover:text-white'
                           }`}
                         >
                           {side}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] uppercase text-[#666] font-bold tracking-wider mb-2 block">Clinical Notes</label>
                    <textarea 
                       value={notes}
                       onChange={e => setNotes(e.target.value)}
                       placeholder="Describe findings (e.g. Corneal Opacity at 3 o'clock)..."
                       className="w-full h-32 bg-[#0a0a0a] border border-[#222] rounded-xl p-3 text-sm text-white focus:border-[#D4A574] outline-none resize-none placeholder:text-[#333]"
                    />
                 </div>
              </div>
           </div>

           <Button 
             disabled={!capturedImage || isSaving}
             onClick={saveRecord}
             className="h-14 rounded-2xl bg-gradient-to-r from-[#D4A574] to-[#b38556] hover:from-[#E5B685] hover:to-[#c49667] text-black font-bold text-sm uppercase tracking-widest shadow-xl shadow-[#D4A574]/10 transition-all active:scale-[0.98]"
           >
              {isSaving ? 'Uploading...' : 'Save to Record'}
              {!isSaving && <Upload className="w-4 h-4 ml-2" />}
           </Button>
        </div>
      </div>
    </div>
  );
}
