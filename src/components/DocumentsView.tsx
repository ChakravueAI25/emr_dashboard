import React, { useEffect, useState } from 'react';
import { Upload, FileText, Video, Image as ImageIcon, Download, Trash2, Eye, Search, Filter, User } from 'lucide-react';
import API_ENDPOINTS from '../config/api';
import { useIsLightTheme } from '../hooks/useTheme';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'image' | 'other';
  size: string;
  uploadedDate: string;
  uploadedBy: string;
  category: string;
  stage?: string; // Which stage uploaded this: reception, opd, doctor
}

function Uploader({ patientRegistrationId, onUploaded }: { patientRegistrationId: string; onUploaded?: (saved: any[]) => void }) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Hidden mobile capture input (invokes native camera on mobile)
  const mobileCaptureRef = React.useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList | null) {
    setSelectedFiles(files);
    setMessage(null);
    if (!files || files.length === 0) return;

    const form = new FormData();
    for (let i = 0; i < files.length; i++) {
      form.append('files', files[i]);
    }
    form.append('uploaded_by', 'receptionist');

    try {
      setUploading(true);
      const resp = await fetch(API_ENDPOINTS.PATIENT_DOCUMENTS(patientRegistrationId), {
        method: 'POST',
        body: form,
      });
      if (!resp.ok) {
        const txt = await resp.text();
        setMessage(`Upload failed: ${resp.status} ${txt}`);
      } else {
        const body = await resp.json();
        setMessage(`Uploaded ${body.saved?.length || 0} files`);
        setSelectedFiles(null);
        if (onUploaded && body.saved) onUploaded(body.saved);
      }
    } catch (err: any) {
      setMessage(`Upload error: ${err?.message || String(err)}`);
    } finally {
      setUploading(false);
    }
  }

  // Start device camera and show modal
  const openCamera = async () => {
    setMessage(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      // Show modal first, attach stream when video element is ready via effect
      setStream(s);
      setShowCamera(true);
    } catch (err: any) {
      setMessage(`Cannot access camera: ${err?.message || String(err)}`);
    }
  };

  const closeCamera = () => {
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch { }
      videoRef.current.srcObject = null;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // When modal is shown and stream is available, attach stream to video element and play
  React.useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      const vid = videoRef.current;
      vid.muted = true; // mute so autoplay works in browsers
      vid.srcObject = stream;

      const tryPlay = () => {
        vid.play().catch(() => {
          // play may be blocked; ignore
        });
      };

      // If metadata is already available, try play immediately, otherwise wait
      if (vid.readyState >= 1) {
        tryPlay();
      } else {
        vid.onloadedmetadata = () => tryPlay();
      }

      return () => {
        try { vid.onloadedmetadata = null; } catch { }
      };
    }
  }, [showCamera, stream]);

  // Capture current video frame, convert to File, and upload
  const capturePhotoAndUpload = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setMessage('Failed to capture image');
        return;
      }
      const timestamp = Date.now();
      const fileName = `camera-${timestamp}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      // Upload via existing flow
      const form = new FormData();
      form.append('files', file);
      form.append('uploaded_by', 'camera');

      try {
        setUploading(true);
        const resp = await fetch(API_ENDPOINTS.PATIENT_DOCUMENTS(patientRegistrationId), {
          method: 'POST',
          body: form,
        });
        if (!resp.ok) {
          const txt = await resp.text();
          setMessage(`Upload failed: ${resp.status} ${txt}`);
        } else {
          const body = await resp.json();
          setMessage(`Uploaded ${body.saved?.length || 0} files`);
          if (onUploaded && body.saved) onUploaded(body.saved);
          closeCamera();
        }
      } catch (err: any) {
        setMessage(`Upload error: ${err?.message || String(err)}`);
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.92);
  };

  // Handle mobile native camera capture via hidden input
  const handleMobileCapture = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await handleFiles(files);
  };

  return (
    <div className="border-2 border-dashed border-[#D4A574] rounded-lg p-8 text-center hover:border-[#D4A574] transition-colors cursor-pointer">
      <Upload className="w-12 h-12 text-[#D4A574] mx-auto mb-4" />
      <h3 className="text-white mb-2">Upload Documents</h3>
      <p className="text-[#8B8B8B] mb-4">Drag and drop files here or click to browse</p>

      {/* Desktop/Mobile file input */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="flex justify-center w-full mb-4">
          <input
            type="file"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Hidden mobile capture input - triggers native camera on mobile */}
        <input
          ref={mobileCaptureRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => handleMobileCapture(e.target.files)}
        />

        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-[#D4A574] text-[#0a0a0a] rounded-lg hover:bg-[#C9955E] transition-colors font-semibold"
            onClick={async () => await handleFiles(selectedFiles)}
            disabled={uploading || !selectedFiles}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>

          <button
            className="px-4 py-2 bg-[#1a1a1a] text-white border border-[#D4A574] rounded-lg hover:bg-[#2a2a2a] transition-colors font-semibold"
            onClick={() => mobileCaptureRef.current?.click()}
            title="Use mobile camera"
          >
            Use Camera
          </button>

          <button
            className="px-4 py-2 bg-[#111827] text-white border border-[#D4A574] rounded-lg hover:bg-[#222] transition-colors font-semibold"
            onClick={openCamera}
            title="Open camera (desktop)"
          >
            Open Camera
          </button>
        </div>
      </div>

      {message && <p className="text-[#8B8B8B] text-sm mt-3 text-center w-full">{message}</p>}
      <p className="text-[#8B8B8B] text-xs mt-4 text-center w-full">Supported: PDF, JPG, PNG, MP4, AVI (Max 500MB)</p>

      {/* Camera modal for desktop */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4 w-[90%] max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white">Camera Capture</h4>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-red-600 rounded" onClick={closeCamera}>Close</button>
                <button className="px-3 py-1 bg-green-600 rounded" onClick={capturePhotoAndUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Capture & Upload'}</button>
              </div>
            </div>
            <div className="w-full h-[60vh] bg-black flex items-center justify-center rounded">
              <video ref={videoRef} className="w-full h-full object-contain" autoPlay playsInline />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentsView({ patientRegistrationId, patientName: initialPatientName }: { patientRegistrationId?: string | null, patientName?: string }) {
  const isLight = useIsLightTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'video' | 'image'>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [patientName, setPatientName] = useState<string>(initialPatientName || '');

  useEffect(() => {
    // Fetch documents for the current patient when patientRegistrationId changes
    async function fetchDocs() {
      if (!patientRegistrationId || patientRegistrationId === 'Not Assigned') {
        setDocuments([]);
        setPatientName('');
        return;
      }
      setLoadingDocs(true);
      try {
        // Fetch patient info
        const patientResp = await fetch(API_ENDPOINTS.PATIENT(patientRegistrationId));
        if (patientResp.ok) {
          const patientData = await patientResp.json();
          setPatientName(patientData.name || '');
        }

        // Fetch documents
        const resp = await fetch(`http://localhost:8008/patients/${encodeURIComponent(patientRegistrationId)}/documents`);
        if (resp.ok) {
          const json = await resp.json();
          const docs = (json.documents || []).map((d: any) => ({
            id: d.id || d._id || `${d.name}-${Math.random()}`,
            name: d.name || 'unnamed',
            type: (d.type === 'mp4' || d.type === 'avi' || d.type === 'mov') ? 'video' : (d.type === 'pdf' ? 'pdf' : (d.type === 'png' || d.type === 'jpg' || d.type === 'jpeg' ? 'image' : 'other')),
            size: d.size ? `${(d.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
            uploadedDate: d.uploadedDate ? d.uploadedDate.split('T')[0] : '',
            uploadedBy: d.uploadedBy || '',
            category: d.category || '',
            stage: d.stage || d.uploadedBy || ''
          }));
          setDocuments(docs);
        } else {
          setDocuments([]);
        }
      } catch (err) {
        setDocuments([]);
      } finally {
        setLoadingDocs(false);
      }
    }

    fetchDocs();
  }, [patientRegistrationId]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-blue-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-green-400" />;
      default:
        return <FileText className="w-5 h-5 text-[#8B8B8B]" />;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getDownloadUrl = (doc: Document, inline = false) => {
    if (!patientRegistrationId) return '#';
    return API_ENDPOINTS.PATIENT_DOCUMENT_DOWNLOAD(patientRegistrationId, doc.id, inline);
  };

  const handlePreview = (doc: Document) => {
    if (!patientRegistrationId) return;
    const url = getDownloadUrl(doc, true);
    window.open(url, '_blank');
  };

  const handleDownload = async (doc: Document) => {
    if (!patientRegistrationId) return;
    try {
      const url = getDownloadUrl(doc, false);
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error('Download failed', resp.statusText);
        return;
      }
      const blob = await resp.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error', err);
    }
  };

  const stats = {
    total: documents.length,
    pdfs: documents.filter(d => d.type === 'pdf').length,
    videos: documents.filter(d => d.type === 'video').length,
    images: documents.filter(d => d.type === 'image').length
  };

  return (
    <div className="max-w-[1600px] mx-auto p-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-2">
        <h1 className="text-4xl font-light text-[var(--theme-text)] tracking-tight">
          Document <span className="font-bold text-[var(--theme-accent)]">Vault</span>
        </h1>
        <p className="text-[var(--theme-text-muted)] text-sm font-medium uppercase tracking-[0.2em] opacity-60">
          Upload and manage patient clinical records
        </p>

        {/* Current Patient Info */}
        {patientRegistrationId && patientRegistrationId !== 'Not Assigned' ? (
          <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors duration-300 ${isLight ? 'bg-[#f5f5f5] border-[#eee]' : 'bg-[#181818] border-[#333]'}`} style={{boxShadow: isLight ? undefined : '0 2px 16px 0 #0008'}}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${isLight ? 'bg-[#fff]' : 'bg-[#232323]'}`}>
              <User className={`w-7 h-7 transition-colors duration-300 ${isLight ? 'text-[#222]' : 'text-[#D4A574]'}`} />
            </div>
            <div>
              <span className={`block text-lg font-bold transition-colors duration-300 ${isLight ? 'text-[#753d3e]' : 'text-[#D4A574]'}`}>Selection Required</span>
              <span className={`block text-sm font-medium transition-colors duration-300 ${isLight ? 'text-[#666]' : 'text-[#aaa]'}`}>SELECT A PATIENT FROM ANY QUEUE TO START UPLOADING</span>
            </div>
          </div>
        ) : (
          <div className={`mt-6 flex items-center gap-4 p-4 rounded-xl border transition-colors duration-300 ${isLight ? 'bg-[#f5f5f5] border-[#eee]' : 'bg-[#181818] border-[#333]'}`} style={{boxShadow: isLight ? undefined : '0 2px 16px 0 #0008'}}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${isLight ? 'bg-[#fff]' : 'bg-[#232323]'}`}>
              <User className={`w-7 h-7 transition-colors duration-300 ${isLight ? 'text-[#222]' : 'text-[#D4A574]'}`} />
            </div>
            <div>
              <span className={`block text-lg font-bold transition-colors duration-300 ${isLight ? 'text-[#753d3e]' : 'text-[#D4A574]'}`}>Selection Required</span>
              <span className={`block text-sm font-medium transition-colors duration-300 ${isLight ? 'text-[#666]' : 'text-[#aaa]'}`}>SELECT A PATIENT FROM ANY QUEUE TO START UPLOADING</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--theme-text-muted)] text-xs mb-1">Total Documents</p>
              <p className="text-[var(--theme-text)] text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[var(--theme-accent)]/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--theme-accent)]" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--theme-text-muted)] text-xs mb-1">PDF Files</p>
              <p className="text-[var(--theme-text)] text-2xl font-bold">{stats.pdfs}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--theme-text-muted)] text-xs mb-1">Videos</p>
              <p className="text-[var(--theme-text)] text-2xl font-bold">{stats.videos}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--theme-text-muted)] text-xs mb-1">Images</p>
              <p className="text-[var(--theme-text)] text-2xl font-bold">{stats.images}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg p-6 mb-6 shadow-lg">
        {patientRegistrationId && patientRegistrationId !== 'Not Assigned' ? (
          <Uploader patientRegistrationId={patientRegistrationId} onUploaded={(saved) => {
            // when upload completes, re-fetch documents to show new files
            (async () => {
              try {
                const resp = await fetch(API_ENDPOINTS.PATIENT_DOCUMENTS(patientRegistrationId));
                if (resp.ok) {
                  const json = await resp.json();
                  const docs = (json.documents || []).map((d: any) => ({
                    id: d.id || d._id || `${d.name}-${Math.random()}`,
                    name: d.name || 'unnamed',
                    type: (d.type === 'mp4' || d.type === 'avi' || d.type === 'mov') ? 'video' : (d.type === 'pdf' ? 'pdf' : (d.type === 'png' || d.type === 'jpg' || d.type === 'jpeg' ? 'image' : 'other')),
                    size: d.size ? `${(d.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
                    uploadedDate: d.uploadedDate ? d.uploadedDate.split('T')[0] : '',
                    uploadedBy: d.uploadedBy || '',
                    category: d.category || ''
                  }));
                  setDocuments(docs);
                }
              } catch (err) {
                // ignore
              }
            })();
          }} />
        ) : (
          <div className="border-2 border-dashed border-[#D4A574] rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-[#D4A574] mx-auto mb-4" />
            <h3 className="text-white mb-2">Upload Documents</h3>
            <p className="text-[#8B8B8B] mb-4 text-center w-full">Save patient details first to enable uploads for that patient.</p>
            <p className="text-[#8B8B8B] text-xs mt-4 text-center w-full">Supported: PDF, JPG, PNG, MP4, AVI (Max 500MB)</p>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg p-4 mb-6 shadow-lg">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-text)] text-xs focus:ring-1 focus:ring-[var(--theme-accent)] transition-all"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--theme-text-muted)]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-text)] text-xs focus:ring-1 focus:ring-[var(--theme-accent)] transition-all"
            >
              <option value="all">All Files</option>
              <option value="pdf">PDFs Only</option>
              <option value="video">Videos Only</option>
              <option value="image">Images Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[var(--theme-border)]">
          <h3 className="text-[var(--theme-text)] font-bold">Documents ({filteredDocuments.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--theme-accent)]/10">
                <th className="text-left p-3 text-[var(--theme-text)] border-r border-[var(--theme-border)] font-bold uppercase tracking-wider">Type</th>
                <th className="text-left p-3 text-[var(--theme-text)] border-r border-[var(--theme-border)] font-bold uppercase tracking-wider">Name</th>
                <th className="text-left p-3 text-[var(--theme-text)] border-r border-[var(--theme-border)] font-bold uppercase tracking-wider">Category</th>
                <th className="text-left p-3 text-[var(--theme-text)] border-r border-[var(--theme-border)] font-bold uppercase tracking-wider">Size</th>
                <th className="text-left p-3 text-[var(--theme-text)] border-r border-[var(--theme-border)] font-bold uppercase tracking-wider">Uploaded</th>
                <th className="text-left p-3 text-[var(--theme-text)] border-r border-[var(--theme-border)] font-bold uppercase tracking-wider">Uploaded By</th>
                <th className="text-center p-3 text-[var(--theme-text)] font-bold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc, index) => (
                <tr
                  key={doc.id}
                  className={`border-b border-[var(--theme-border)] hover:bg-[var(--theme-accent)]/5 transition-colors ${index % 2 === 0 ? 'bg-[var(--theme-bg)]' : 'bg-[var(--theme-bg-tertiary)]'
                    }`}
                >
                  <td className="p-3 border-r border-[var(--theme-border)]">
                    <div className="flex items-center justify-center">
                      {getFileIcon(doc.type)}
                    </div>
                  </td>
                  <td className="p-3 border-r border-[var(--theme-border)]">
                    <span className="text-[var(--theme-text)] font-medium">{doc.name}</span>
                  </td>
                  <td className="p-3 border-r border-[var(--theme-border)]">
                    <span className="text-[var(--theme-text-muted)]">{doc.category}</span>
                  </td>
                  <td className="p-3 border-r border-[var(--theme-border)]">
                    <span className="text-[var(--theme-text-muted)]">{doc.size}</span>
                  </td>
                  <td className="p-3 border-r border-[var(--theme-border)]">
                    <span className="text-[var(--theme-text-muted)]">{doc.uploadedDate}</span>
                  </td>
                  <td className="p-3 border-r border-[var(--theme-border)]">
                    <span className="text-[var(--theme-text-muted)]">{doc.uploadedBy}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handlePreview(doc)} className="p-1.5 rounded hover:bg-[var(--theme-accent)]/20 transition-colors group">
                        <Eye className="w-4 h-4 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-accent)]" />
                      </button>
                      <button onClick={() => handleDownload(doc)} className="p-1.5 rounded hover:bg-blue-500/20 transition-colors group">
                        <Download className="w-4 h-4 text-[var(--theme-text-muted)] group-hover:text-blue-500" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-red-500/20 transition-colors group">
                        <Trash2 className="w-4 h-4 text-[var(--theme-text-muted)] group-hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
