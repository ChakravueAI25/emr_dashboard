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
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [eyeSide, setEyeSide] = useState<'Left' | 'Right' | 'Both'>('Both');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignore pause failures during teardown.
      }
      videoRef.current.srcObject = null;
    }

    streamRef.current = null;
    setStream(null);
  }, []);

  // Initialize camera permissions and load devices
  useEffect(() => {
    async function initCamera() {
      // Check for HTTPS
      if (location.protocol !== "https:" && location.hostname !== "localhost") {
        console.warn("Camera access requires HTTPS in modern browsers.");
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           throw new Error("Camera API not supported in this browser.");
        }

        // Request initial permission to ensure prompt appears
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

        // Stop the tracks immediately - we just wanted the permission grant
        stream.getTracks().forEach(track => track.stop());

        // Now we can enumerate devices with labels
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
        
        if (videoDevs.length > 0) {
           setSelectedDeviceId(prev => prev || videoDevs[0].deviceId);
        }
      } catch (err) {
        console.error("Camera permission error:", err);
        setCameraError("Unable to access camera. Please allow camera permission.");
      }
    }

    initCamera();
  }, []);

  // Start selected camera
  useEffect(() => {
    if (!selectedDeviceId) return;

    async function startCamera() {
      stopCamera();

      try {
        if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permissionStatus.state === 'denied') {
            showAlert('Camera access is blocked in the browser. Enable camera permission for this site and reopen the slit-lamp screen.');
            return;
          }
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        streamRef.current = newStream;
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        showAlert('Could not access the camera. Check browser permission settings and verify no other app is using the device.');
      }
    }

    startCamera();
  }, [selectedDeviceId, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Ensure video plays when stream changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
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
    <div className="min-h-screen flex flex-col p-6 animate-in fade-in zoom-in-95 duration-500 overflow-visible">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
           <Button onClick={() => { stopCamera(); onBack(); }} className="flex items-center justify-center w-10 h-10 p-0 bg-[var(--theme-accent)] text-white force-text-white rounded-full shadow-lg hover:opacity-90 transition-all flex-shrink-0">
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

      <div className="flex-grow flex flex-col gap-4 h-auto overflow-visible">
        {/* Main Viewfinder */}
        <div className="flex-shrink-0 bg-black rounded-3xl border border-[#222] overflow-hidden relative flex items-center justify-center group shadow-2xl min-h-[400px]">
           {!capturedImage ? (
             <>
               {cameraError ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0a] rounded-xl border border-red-900/30">
                     <Camera className="w-12 h-12 text-red-500 mb-4 opacity-50" />
                     <div className="text-red-400 font-medium mb-2">{cameraError}</div>
                     <p className="text-[#666] text-xs max-w-xs mx-auto">
                        Please check your browser permissions or ensure no other application is using the camera.
                     </p>
                  </div>
               ) : (
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
               )}
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
        <div className="flex-grow flex flex-col gap-4 overflow-visible w-full min-h-0">
           {/* Patient Context */}
           <div className="bg-[#111] p-5 rounded-3xl border border-[#222] flex-grow flex flex-col justify-between">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                 <FileImage className="w-4 h-4 text-[#D4A574]" />
                 Context
              </h3>
              
              <div className="space-y-4 flex-grow flex flex-col">
                 <div className="flex-shrink-0">
                    <label className="text-[10px] uppercase text-[#666] font-bold tracking-wider">Patient ID</label>
                    <div className="text-sm text-white font-mono mt-1 break-all whitespace-normal">{patientId || 'Not Selected'}</div>
                 </div>
                 
                 <div className="flex-shrink-0">
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

                 <div className="flex-grow flex flex-col">
                    <label className="text-[10px] uppercase text-[#666] font-bold tracking-wider mb-2 block flex-shrink-0">Clinical Notes</label>
                    <textarea 
                       value={notes}
                       onChange={e => setNotes(e.target.value)}
                       placeholder="Describe findings (e.g. Corneal Opacity at 3 o'clock)..."
                       className="w-full h-full min-h-[100px] flex-grow bg-[#0a0a0a] border border-[#222] rounded-xl p-3 text-sm text-white focus:border-[#D4A574] outline-none resize-none placeholder:text-[#333]"
                    />
                 </div>
              </div>
           </div>

           <Button 
             disabled={!capturedImage || isSaving}
             onClick={saveRecord}
             className="h-14 flex-shrink-0 rounded-2xl bg-gradient-to-r from-[#D4A574] to-[#b38556] hover:from-[#E5B685] hover:to-[#c49667] text-black font-bold text-sm uppercase tracking-widest shadow-xl shadow-[#D4A574]/10 transition-all active:scale-[0.98]"
           >
              {isSaving ? 'Uploading...' : 'Save to Record'}
              {!isSaving && <Upload className="w-4 h-4 ml-2" />}
           </Button>
        </div>
      </div>
    </div>
  );
}
