import React, { useState } from 'react';
import { SlitLampView } from './SlitLampView';
import { VideoConsultationView } from './VideoConsultationView';
import { Video, Camera, Mic, Lock, MonitorSmartphone, Wifi } from 'lucide-react';

interface TelemedicineViewProps {
  patientId?: string;
  patientName?: string;
  doctorName?: string;
}

type Mode = 'landing' | 'slitlamp' | 'virtual';

export function TelemedicineView(props: TelemedicineViewProps) {
  const [mode, setMode] = useState<Mode>('landing');

  if (mode === 'slitlamp') {
    return <SlitLampView onBack={() => setMode('landing')} {...props} />;
  }

  if (mode === 'virtual') {
    return <VideoConsultationView onBack={() => setMode('landing')} username={props.doctorName || 'Doctor'} />;
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-700 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Tele-Ophthalmology Suite</h1>
        <p className="text-[#666]">Remote diagnostics and real-time imaging interface</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full mt-10">

        {/* Card 1: Slit Lamp Imaging */}
        <button
          onClick={() => setMode('slitlamp')}
          className="group relative h-[400px] rounded-[40px] border border-[#222] bg-gradient-to-br from-[#111] to-[#0a0a0a] hover:border-[#D4A574]/50 transition-all overflow-hidden text-left p-8 flex flex-col shadow-2xl hover:shadow-[#D4A574]/10"
        >

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

          <div className="relative z-10 flex-1 flex flex-col justify-end">
            <div className="w-16 h-16 rounded-2xl bg-[#D4A574] text-black flex items-center justify-center mb-6 shadow-lg shadow-[#D4A574]/20 group-hover:scale-110 transition-transform duration-500">
              <Camera className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Slit Lamp Imaging</h2>
            <p className="text-[#888] mb-6 leading-relaxed">Connect to digital slit lamp camera to capture live anterior segment feeds and save directly to patient EMR.</p>

            <div className="flex items-center gap-4 text-xs font-mono text-[#D4A574] uppercase tracking-widest">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> System Ready</span>
            </div>
          </div>
        </button>

        {/* Card 2: Virtual Consultation */}
        <button
          onClick={() => setMode('virtual')}
          className="group relative h-[400px] rounded-[40px] border border-[#222] bg-[#0c0c0c] hover:border-[#D4A574]/50 overflow-hidden text-left p-8 flex flex-col shadow-2xl hover:shadow-[#D4A574]/10 transition-all"
        >


          <div className="relative z-10 flex-1 flex flex-col justify-end">
            <div className="w-16 h-16 rounded-2xl bg-[#D4A574] text-black flex items-center justify-center mb-6 shadow-lg shadow-[#D4A574]/20 group-hover:scale-110 transition-transform duration-500">
              <MonitorSmartphone className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Virtual Consultation</h2>
            <p className="text-[#888] mb-6 leading-relaxed">Remote HD video conferencing with screen sharing and integrated fundus image review.</p>

            <div className="inline-flex items-center self-start gap-2 px-4 py-2 bg-[#D4A574]/10 rounded-full border border-[#D4A574]/20">
              <Wifi className="w-3 h-3 text-[#D4A574]" />
              <span className="text-[10px] font-bold text-[#D4A574] uppercase tracking-[0.2em]">Ready to Connect</span>
            </div>
          </div>
        </button>

      </div>
    </div>
  );
}
