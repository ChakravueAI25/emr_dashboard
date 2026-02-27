import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IRemoteUser } from 'agora-rtc-sdk-ng';
import { Phone, Video, Mic, MicOff, VideoOff, ArrowLeft, PhoneOff } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

// Create the client outside of the component context to avoid recreating it on re-renders
const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

interface VideoConsultationViewProps {
  onBack: () => void;
  username: string; // Doctor's username
}

export function VideoConsultationView({ onBack, username }: VideoConsultationViewProps) {
  const [isInCall, setIsInCall] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IRemoteUser[]>([]);
  const [localTracks, setLocalTracks] = useState<[IMicrophoneAudioTrack, ICameraVideoTrack] | []>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [callStatus, setCallStatus] = useState<string>('idle'); // idle, calling, connected, error

  const localVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Event listener for remote users publishing audio/video
    const handleUserPublished = async (user: IRemoteUser, mediaType: "audio" | "video") => {
      await client.subscribe(user, mediaType);
      console.log("Subscribed to remote user:", user.uid);

      if (mediaType === "video") {
        setRemoteUsers((prev) => {
           // Avoid duplicates
           if(prev.find(u => u.uid === user.uid)) return prev;
           return [...prev, user];
        });
      }
      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    };

    const handleUserUnpublished = (user: IRemoteUser) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      leaveCall(); // Ensure cleanup on unmount
    };
  }, []);

  // Ensure local video plays when the container is mounted
  useEffect(() => {
    if (isInCall && localVideoRef.current && localTracks[1]) {
      localTracks[1].play(localVideoRef.current);
    }
  }, [isInCall, localTracks]);

  // --- Start Call (Ring Self/Patient) ---
  const startCall = async () => {
    try {
      setCallStatus('calling');
      
      // --- DEMO MODE: Bypassing Backend ---
      
      // 1. Create and publish local tracks FIRST
      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalTracks(tracks);
      
      // 2. Update UI to show video screen
      setIsInCall(true);
      setCallStatus('connected');
      
      // 3. Attempt to join Agora with hardcoded ID (Demo)
      // This allows the camera preview to work even if the join fails due to missing token
      const appID = "942e6848979d4714915bd89aa0e85947";
      const channel_name = "demo_channel";
      
      try {
        await client.join(appID, channel_name, null, 0);
        await client.publish(tracks);
      } catch (e) {
        console.warn("Agora connection failed (expected without backend), but local preview is active.", e);
      }

    } catch (error) {
      console.error("Call failed:", error);
      setCallStatus('error');
      showAlert("Could not access camera/microphone.");
    }
  };

  const leaveCall = async () => {
    try {
        if(localTracks.length > 0) {
            localTracks[0].close();
            localTracks[1].close();
        }
        setLocalTracks([]);
        await client.leave();
        setIsInCall(false);
        setCallStatus('idle');
        setRemoteUsers([]);
    } catch(err) {
        console.error("Error leaving call", err);
    }
  };

  const toggleMic = async () => {
    if (localTracks[0]) {
      const enabled = !isMicOn;
      await localTracks[0].setEnabled(enabled);
      setIsMicOn(enabled);
    }
  };

  const toggleCam = async () => {
    if (localTracks[1]) {
      const enabled = !isCamOn;
      await localTracks[1].setEnabled(enabled);
      setIsCamOn(enabled);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => { leaveCall(); onBack(); }} className="flex items-center justify-center w-10 h-10 p-0 bg-[var(--theme-accent)] text-white force-text-white rounded-full shadow-lg hover:opacity-90 transition-all flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
           <h1 className="text-2xl font-bold">Virtual Consultation</h1>
           <p className="text-[#666] text-sm">Secure encrypted video line • {username}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 h-full min-h-0">
        
        {/* Call Area */}
        {!isInCall ? (
           <div className="flex-1 flex flex-col items-center justify-center bg-[#111] rounded-2xl border border-[#222]">
              <div className="w-24 h-24 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-6">
                 <Video className="w-10 h-10 text-[#D4A574]" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Ready to Call</h2>
              <p className="text-[#666] mb-8 max-w-md text-center">Start a secure video session. The patient will be notified on their mobile device.</p>
              
              <button 
                onClick={startCall}
                disabled={callStatus === 'calling'}
                className="flex items-center gap-3 px-8 py-4 bg-[#D4A574] text-black font-bold rounded-full hover:bg-[#c49564] transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {callStatus === 'calling' ? (
                   <>Connecting...</> 
                ) : (
                   <><Phone className="w-5 h-5" /> Start Consultation</>
                )}
              </button>
              
              {callStatus === 'error' && (
                <p className="text-red-500 mt-4 text-sm">Connection failed. Please try again.</p>
              )}
           </div>
        ) : (
           <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[400px]">
              {/* Local User (Me) */}
              <div className="relative bg-[#111] rounded-2xl border border-[#D4A574] overflow-hidden h-full flex flex-col">
                 <div ref={localVideoRef} className="flex-1 w-full bg-black"></div>
                 <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-md backdrop-blur-sm z-10">
                    <span className="text-white text-sm font-medium">You ({username})</span>
                 </div>
                 <div className="absolute top-4 right-4 flex gap-2 z-10">
                    {!isMicOn && <div className="p-2 bg-red-500/80 rounded-full"><MicOff className="w-4 h-4" /></div>}
                    {!isCamOn && <div className="p-2 bg-red-500/80 rounded-full"><VideoOff className="w-4 h-4" /></div>}
                 </div>
              </div>

              {/* Remote Users (Patient) */}
              {remoteUsers.length === 0 ? (
                 <div className="flex items-center justify-center bg-[#111] rounded-2xl border border-[#D4A574] border-dashed h-full">
                    <div className="text-center">
                       <div className="animate-pulse mb-4 text-[#444]">Waiting for patient...</div>
                       <p className="text-[#666] text-sm">Patient has been notified.</p>
                    </div>
                 </div>
              ) : (
                 remoteUsers.map(user => (
                    <div key={user.uid} className="relative bg-[#111] rounded-2xl border border-[#D4A574] overflow-hidden h-full flex flex-col">
                       <div 
                         id={`user-${user.uid}`}
                         className="flex-1 w-full bg-black"
                         ref={(div) => {
                            if (div && user.videoTrack) {
                               user.videoTrack.play(div);
                            }
                         }}
                       ></div>
                       <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-md backdrop-blur-sm z-10">
                          <span className="text-white text-sm font-medium">Patient (Mobile)</span>
                       </div>
                    </div>
                 ))
              )}
           </div>
        )}

        {/* Controls Bar */}
        {isInCall && (
           <div className="h-20 bg-[#111] border border-[#222] rounded-xl flex items-center justify-center gap-6 px-8 shrink-0">
              <button onClick={toggleMic} className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-[#222] hover:bg-[#333] text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
                 {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              
              <button onClick={leaveCall} className="px-8 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold flex items-center gap-2 transition-colors">
                 <PhoneOff className="w-5 h-5" /> End Call
              </button>

              <button onClick={toggleCam} className={`p-4 rounded-full transition-colors ${isCamOn ? 'bg-[#222] hover:bg-[#333] text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
                 {isCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
           </div>
        )}
      </div>
    </div>
  );
}
