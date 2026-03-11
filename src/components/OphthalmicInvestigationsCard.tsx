import { useRef, useState } from 'react';
import { FileSearch, Scan, Activity, Upload, Eye, Download } from 'lucide-react';
import { ExpandableCard } from './ExpandableCard';
import { EditableText, EditableTextHandle } from './EditableText';
import { CardHeader } from './CardHeader';
import API_ENDPOINTS from '../config/api';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { InvestigationDocumentRef, OphthalmicInvestigationsData } from './patient';

interface OphthalmicInvestigationsCardProps {
  data?: OphthalmicInvestigationsData;
  updateData?: (path: (string | number)[], value: any) => void;
  isEditable?: boolean;
  patientRegistrationId?: string | null;
}

export function OphthalmicInvestigationsCard({ data, updateData, isEditable = false, patientRegistrationId }: OphthalmicInvestigationsCardProps) {
  const fieldRefs = useRef<{ [key: string]: EditableTextHandle | null }>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'pdf' | 'video' | 'image' | 'other'>('other');
  const [previewName, setPreviewName] = useState('');

  const octFindings = data?.oct || { od: { cmt: '', rnfl: '', gcl: '', findings: '' }, os: { cmt: '', rnfl: '', gcl: '', findings: '' }, date: '', performedBy: '' };
  const hvfFindings = data?.hvf || { od: {}, os: {}, date: '', performedBy: '' };
  const additionalImageRefs = Array.isArray(data?.additionalImages) ? data.additionalImages : [];

  const setField = (path: (string | number)[], value: any) => {
    if (!updateData) return;
    updateData(['ophthalmicInvestigations', ...path], value);
  };

  const getFileExtension = (fileName?: string, explicitType?: string) => {
    if (explicitType) return explicitType.toLowerCase();
    if (!fileName || !fileName.includes('.')) return '';
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  const getPreviewType = (fileName?: string, explicitType?: string): 'pdf' | 'video' | 'image' | 'other' => {
    const ext = getFileExtension(fileName, explicitType);
    if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video';
    return 'other';
  };

  const createDocumentRef = (saved: any): InvestigationDocumentRef => ({
    documentId: saved?.id || saved?.fileId || '',
    name: saved?.name || '',
    type: saved?.type || getFileExtension(saved?.name),
  });

  const uploadFilesToPatientDocuments = async (files: File[]) => {
    if (!patientRegistrationId || patientRegistrationId === 'Not Assigned') {
      console.error('Cannot upload investigation documents without a patient registration ID');
      return [] as InvestigationDocumentRef[];
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('uploaded_by', 'doctor');

    const response = await fetch(API_ENDPOINTS.PATIENT_DOCUMENTS(patientRegistrationId), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to upload investigation document');
    }

    const body = await response.json();
    return (body.saved || []).map(createDocumentRef);
  };

  const handleSingleDocumentUpload = async (file: File, section: 'oct' | 'hvf') => {
    try {
      const [saved] = await uploadFilesToPatientDocuments([file]);
      if (!saved) return;
      setField([section, 'documentId'], saved.documentId);
      setField([section, 'name'], saved.name);
      setField([section, 'type'], saved.type);
    } catch (err) {
      console.error(`Failed to upload ${section.toUpperCase()} document`, err);
    }
  };

  const handlePachymetryAndColourVisionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const [saved] = await uploadFilesToPatientDocuments([file]);
      if (!saved) return;
      setField(['pachymetry', 'documentId'], saved.documentId);
      setField(['pachymetry', 'name'], saved.name);
      setField(['pachymetry', 'type'], saved.type);
      setField(['colourVision', 'documentId'], saved.documentId);
      setField(['colourVision', 'name'], saved.name);
      setField(['colourVision', 'type'], saved.type);
    } catch (err) {
      console.error('Failed to upload pachymetry/colour vision document', err);
    }
  };

  const handleAdditionalImagesUpload = async (files: File[]) => {
    if (!files.length) return;

    try {
      const saved = await uploadFilesToPatientDocuments(files);
      const next = [...additionalImageRefs, ...saved];
      setField(['additionalImages'], next);
    } catch (err) {
      console.error('Failed to upload additional investigation images', err);
    }
  };

  const openPreview = (documentRef: InvestigationDocumentRef | undefined) => {
    if (!documentRef?.documentId || !patientRegistrationId) return;
    setPreviewFile(API_ENDPOINTS.PATIENT_DOCUMENT_DOWNLOAD(patientRegistrationId, documentRef.documentId, true));
    setPreviewType(getPreviewType(documentRef.name, documentRef.type));
    setPreviewName(documentRef.name || 'Document Preview');
    setPreviewOpen(true);
  };

  const handleDownload = async (documentRef: InvestigationDocumentRef | undefined) => {
    if (!documentRef?.documentId || !patientRegistrationId) return;

    try {
      const url = API_ENDPOINTS.PATIENT_DOCUMENT_DOWNLOAD(patientRegistrationId, documentRef.documentId, false);
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Download failed', response.statusText);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = documentRef.name || 'investigation-document';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error', err);
    }
  };

  const renderDocumentActions = (documentRef: InvestigationDocumentRef | undefined) => {
    if (!documentRef?.documentId || !documentRef?.name) return null;

    return (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="max-w-[240px] truncate text-green-500">{documentRef.name}</span>
        <button onClick={() => openPreview(documentRef)} className="rounded p-1 text-[#8B8B8B] transition-colors hover:bg-[#2a2a2a] hover:text-[#D4A574]" type="button">
          <Eye className="h-4 w-4" />
        </button>
        <button onClick={() => handleDownload(documentRef)} className="rounded p-1 text-[#8B8B8B] transition-colors hover:bg-[#2a2a2a] hover:text-blue-400" type="button">
          <Download className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const cardContent = (
    <>
      <CardHeader icon={FileSearch} title="Investigations" />
      <div className="space-y-2 flex-1">
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">OCT</span>
            <span className="text-[#4CAF50] text-sm">Completed</span>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">HVF</span>
            <span className="text-[#4CAF50] text-sm">Completed</span>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#D4A574]">
          <div className="flex items-center justify-between">
            <span className="text-[#8B8B8B] text-xs">FFA</span>
            <span className="text-[#8B8B8B] text-sm">Pending</span>
          </div>
        </div>
      </div>
    </>
  );

  const expandedContent = (
    <div className="space-y-6">
      {/* OCT Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Scan className="w-4 h-4 text-[#D4A574]" />
          <h4 className="text-[#D4A574] text-lg">OCT (Optical Coherence Tomography)</h4>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['oct-date']?.startEditing()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8B8B8B] text-xs">Date:</span>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  ref={(el) => { fieldRefs.current['oct-date'] = el; }}
                  value={octFindings.date || ''}
                  onSave={(val) => setField(['oct', 'date'], val)}
                  className="text-white text-sm"
                  isEditable={isEditable}
                />
              </div>
            </div>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                fieldRefs.current['oct-performedBy']?.startEditing();
              }}
            >
              <span className="text-[#8B8B8B] text-xs">Performed By:</span>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  ref={(el) => { fieldRefs.current['oct-performedBy'] = el; }}
                  value={octFindings.performedBy || ''}
                  onSave={(val) => setField(['oct', 'performedBy'], val)}
                  className="text-white text-sm"
                  isEditable={isEditable}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f3e0c8] dark:bg-[#D4A574]/20">
                <th className="text-left p-3 text-gray-900 dark:text-white border-r border-[#D4A574] text-xs font-semibold">Parameter</th>
                <th className="text-center p-3 text-gray-900 dark:text-white border-r border-[#D4A574] text-xs font-semibold">OD (Right Eye)</th>
                <th className="text-center p-3 text-gray-900 dark:text-white text-xs font-semibold">OS (Left Eye)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">CMT (Î¼m)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['oct-od-cmt']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['oct-od-cmt'] = el; }}
                    value={(octFindings.od && (octFindings.od as any).cmt) || ''}
                    onSave={(val) => setField(['oct', 'od', 'cmt'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                    evalField="CMT"
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['oct-os-cmt']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['oct-os-cmt'] = el; }}
                    value={(octFindings.os && (octFindings.os as any).cmt) || ''}
                    onSave={(val) => setField(['oct', 'os', 'cmt'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                    evalField="CMT"
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">RNFL</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['oct-od-rnfl']?.startEditing()}
                >                  <EditableText
                    ref={(el) => { fieldRefs.current['oct-od-rnfl'] = el; }}
                    value={(octFindings.od && (octFindings.od as any).rnfl) || ''}
                    onSave={(val) => setField(['oct', 'od', 'rnfl'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['oct-os-rnfl']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['oct-os-rnfl'] = el; }}
                    value={(octFindings.os && (octFindings.os as any).rnfl) || ''}
                    onSave={(val) => setField(['oct', 'os', 'rnfl'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">GCL</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['oct-od-gcl']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['oct-od-gcl'] = el; }}
                    value={(octFindings.od && (octFindings.od as any).gcl) || ''}
                    onSave={(val) => setField(['oct', 'od', 'gcl'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['oct-os-gcl']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['oct-os-gcl'] = el; }}
                    value={(octFindings.os && (octFindings.os as any).gcl) || ''}
                    onSave={(val) => setField(['oct', 'os', 'gcl'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">Findings</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['oct-od-findings']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['oct-od-findings'] = el; }}
                    value={(octFindings.od && (octFindings.od as any).findings) || ''}
                    onSave={(val) => setField(['oct', 'od', 'findings'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['oct-os-findings']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['oct-os-findings'] = el; }}
                    value={(octFindings.os && (octFindings.os as any).findings) || ''}
                    onSave={(val) => setField(['oct', 'os', 'findings'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* OCT Image Upload */}
        {isEditable && (
          <div className="mt-3">
            <label className="block text-[#8B8B8B] text-xs mb-2">Upload OCT Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleSingleDocumentUpload(file, 'oct');
                }
              }}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded text-white text-xs cursor-pointer"
            />
            {renderDocumentActions(data?.oct)}
          </div>
        )}
      </div>

      {/* HVF Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#D4A574]" />
          <h4 className="text-[#D4A574] text-xl">HVF (Humphrey Visual Field)</h4>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div
            className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3 cursor-pointer hover:border-[#D4A574] transition-colors"
            onClick={() => fieldRefs.current['hvf-date']?.startEditing()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#8B8B8B] text-sm">Date:</span>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  ref={(el) => { fieldRefs.current['hvf-date'] = el; }}
                  value={hvfFindings.date || ''}
                  onSave={(val) => setField(['hvf', 'date'], val)}
                  className="text-white text-sm"
                  isEditable={isEditable}
                />
              </div>
            </div>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                fieldRefs.current['hvf-performedBy']?.startEditing();
              }}
            >
              <span className="text-[#8B8B8B] text-sm">Performed By:</span>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableText
                  ref={(el) => { fieldRefs.current['hvf-performedBy'] = el; }}
                  value={hvfFindings.performedBy || ''}
                  onSave={(val) => setField(['hvf', 'performedBy'], val)}
                  className="text-white text-sm"
                  isEditable={isEditable}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f3e0c8] dark:bg-[#D4A574]/20">
                <th className="text-left p-3 text-gray-900 dark:text-white border-r border-[#D4A574] font-semibold">Parameter</th>
                <th className="text-center p-3 text-gray-900 dark:text-white border-r border-[#D4A574] font-semibold">OD (Right Eye)</th>
                <th className="text-center p-3 text-gray-900 dark:text-white font-semibold">OS (Left Eye)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">MD (dB)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-od-md']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-od-md'] = el; }}
                    value={(hvfFindings.od && (hvfFindings.od as any).md) || ''}
                    onSave={(val) => setField(['hvf', 'od', 'md'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                    evalField="MD"
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-os-md']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-os-md'] = el; }}
                    value={(hvfFindings.os && (hvfFindings.os as any).md) || ''}
                    onSave={(val) => setField(['hvf', 'os', 'md'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                    evalField="MD"
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">PSD (dB)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-od-psd']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-od-psd'] = el; }}
                    value={(hvfFindings.od && (hvfFindings.od as any).psd) || ''}
                    onSave={(val) => setField(['hvf', 'od', 'psd'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                    evalField="PSD"
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-os-psd']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-os-psd'] = el; }}
                    value={(hvfFindings.os && (hvfFindings.os as any).psd) || ''}
                    onSave={(val) => setField(['hvf', 'os', 'psd'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                    evalField="PSD"
                  />
                </td>
              </tr>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">VFI (%)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-od-vfi']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-od-vfi'] = el; }}
                    value={(hvfFindings.od && (hvfFindings.od as any).vfi) || ''}
                    onSave={(val) => setField(['hvf', 'od', 'vfi'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                    evalField="VFI"
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-os-vfi']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-os-vfi'] = el; }}
                    value={(hvfFindings.os && (hvfFindings.os as any).vfi) || ''}
                    onSave={(val) => setField(['hvf', 'os', 'vfi'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                    evalField="VFI"
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">Reliability</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-od-reliability']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-od-reliability'] = el; }}
                    value={(hvfFindings.od && (hvfFindings.od as any).reliability) || ''}
                    onSave={(val) => setField(['hvf', 'od', 'reliability'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-os-reliability']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-os-reliability'] = el; }}
                    value={(hvfFindings.os && (hvfFindings.os as any).reliability) || ''}
                    onSave={(val) => setField(['hvf', 'os', 'reliability'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">Findings</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-od-findings']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-od-findings'] = el; }}
                    value={(hvfFindings.od && (hvfFindings.od as any).findings) || ''}
                    onSave={(val) => setField(['hvf', 'od', 'findings'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['hvf-os-findings']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['hvf-os-findings'] = el; }}
                    value={(hvfFindings.os && (hvfFindings.os as any).findings) || ''}
                    onSave={(val) => setField(['hvf', 'os', 'findings'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* HVF Image Upload */}
        {isEditable && (
          <div className="mt-3">
            <label className="block text-[#8B8B8B] text-xl mb-2">Upload HVF Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleSingleDocumentUpload(file, 'hvf');
                }
              }}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded text-white text-xs cursor-pointer"
            />
            {renderDocumentActions(data?.hvf)}
          </div>
        )}
      </div>

      {/* Biometry Section */}
      <div>
        <h4 className="text-[#D4A574] text-xl mb-3">Biometry</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f3e0c8] dark:bg-[#D4A574]/20">
                <th className="text-left p-3 text-gray-900 dark:text-white border-r border-[#D4A574] font-semibold">Parameter</th>
                <th className="text-center p-3 text-gray-900 dark:text-white border-r border-[#D4A574] font-semibold">OD (Right Eye)</th>
                <th className="text-center p-3 text-gray-900 dark:text-white font-semibold">OS (Left Eye)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">AXL (mm)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-axl']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-axl'] = el; }}
                    value={(data?.biometry?.od?.axl as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'axl'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-axl']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-axl'] = el; }}
                    value={(data?.biometry?.os?.axl as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'axl'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">K1 (D)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-k1']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-k1'] = el; }}
                    value={(data?.biometry?.od?.k1 as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'k1'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-k1']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-k1'] = el; }}
                    value={(data?.biometry?.os?.k1 as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'k1'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">K1 Axis (Â°)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-k1Axis']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-k1Axis'] = el; }}
                    value={(data?.biometry?.od?.k1Axis as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'k1Axis'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-k1Axis']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-k1Axis'] = el; }}
                    value={(data?.biometry?.os?.k1Axis as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'k1Axis'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">A-constant</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-aConstant']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-aConstant'] = el; }}
                    value={(data?.biometry?.od?.aConstant as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'aConstant'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-aConstant']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-aConstant'] = el; }}
                    value={(data?.biometry?.os?.aConstant as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'aConstant'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">K2 (D)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-k2']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-k2'] = el; }}
                    value={(data?.biometry?.od?.k2 as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'k2'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-k2']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-k2'] = el; }}
                    value={(data?.biometry?.os?.k2 as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'k2'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">K2 Axis (Â°)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-k2Axis']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-k2Axis'] = el; }}
                    value={(data?.biometry?.od?.k2Axis as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'k2Axis'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-k2Axis']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-k2Axis'] = el; }}
                    value={(data?.biometry?.os?.k2Axis as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'k2Axis'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">A-constant</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-aConstant2']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-aConstant2'] = el; }}
                    value={(data?.biometry?.od?.aConstant2 as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'aConstant2'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-aConstant2']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-aConstant2'] = el; }}
                    value={(data?.biometry?.os?.aConstant2 as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'aConstant2'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">A1 Length (mm)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-a1Length']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-a1Length'] = el; }}
                    value={(data?.biometry?.od?.a1Length as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'a1Length'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-a1Length']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-a1Length'] = el; }}
                    value={(data?.biometry?.os?.a1Length as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'a1Length'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">IOL Power 1 (D)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-iolPower1']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-iolPower1'] = el; }}
                    value={(data?.biometry?.od?.iolPower1 as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'iolPower1'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-iolPower1']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-iolPower1'] = el; }}
                    value={(data?.biometry?.os?.iolPower1 as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'iolPower1'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">IOL Power 2 (D)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-iolPower2']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-iolPower2'] = el; }}
                    value={(data?.biometry?.od?.iolPower2 as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'iolPower2'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-iolPower2']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-iolPower2'] = el; }}
                    value={(data?.biometry?.os?.iolPower2 as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'iolPower2'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#121212]">
                <td className="p-3 text-white border-r border-[#D4A574]">Lens Thickness (mm)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-lensThickness']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-lensThickness'] = el; }}
                    value={(data?.biometry?.od?.lensThickness as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'lensThickness'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-lensThickness']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-lensThickness'] = el; }}
                    value={(data?.biometry?.os?.lensThickness as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'lensThickness'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
              <tr className="bg-[#1a1a1a]">
                <td className="p-3 text-white border-r border-[#D4A574]">W2W (mm)</td>
                <td
                  className="p-3 text-center border-r border-[#D4A574] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-od-w2w']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-od-w2w'] = el; }}
                    value={(data?.biometry?.od?.w2w as string) || ''}
                    onSave={(val) => setField(['biometry', 'od', 'w2w'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
                <td
                  className="p-3 text-center cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                  onClick={() => fieldRefs.current['biometry-os-w2w']?.startEditing()}
                >
                  <EditableText
                    ref={(el) => { fieldRefs.current['biometry-os-w2w'] = el; }}
                    value={(data?.biometry?.os?.w2w as string) || ''}
                    onSave={(val) => setField(['biometry', 'os', 'w2w'], val)}
                    className="text-white text-center text-sm"
                    isEditable={isEditable}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pachymetry and Colour Vision - Side by Side */}
      <div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Pachymetry Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scan className="w-4 h-4 text-[#D4A574]" />
              <h4 className="text-[#D4A574] text-xl">Pachymetry</h4>
            </div>

            <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3">
              <div
                className="flex items-center justify-between mb-2 cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                onClick={() => fieldRefs.current['pachymetry-od']?.startEditing()}
              >
                <span className="text-[#8B8B8B] text-sm">OD (Âµm):</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => { fieldRefs.current['pachymetry-od'] = el; }}
                    value={(data?.pachymetry?.od as string) || ''}
                    onSave={(val) => setField(['pachymetry', 'od'], val)}
                    className="text-white text-sm"
                    isEditable={isEditable}
                  />
                </div>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                onClick={() => fieldRefs.current['pachymetry-os']?.startEditing()}
              >
                <span className="text-[#8B8B8B] text-sm">OS (Âµm):</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => { fieldRefs.current['pachymetry-os'] = el; }}
                    value={(data?.pachymetry?.os as string) || ''}
                    onSave={(val) => setField(['pachymetry', 'os'], val)}
                    className="text-white text-sm"
                    isEditable={isEditable}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Colour Vision Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scan className="w-4 h-4 text-[#D4A574]" />
              <h4 className="text-[#D4A574] text-xl">Colour Vision</h4>
            </div>

            <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-3">
              <div
                className="flex items-center justify-between mb-2 cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                onClick={() => fieldRefs.current['colourVision-od']?.startEditing()}
              >
                <span className="text-[#8B8B8B] text-sm">OD:</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => { fieldRefs.current['colourVision-od'] = el; }}
                    value={(data?.colourVision?.od as string) || ''}
                    onSave={(val) => setField(['colourVision', 'od'], val)}
                    className="text-white text-sm"
                    isEditable={isEditable}
                  />
                </div>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-[#2a2a2a] transition-colors p-1 rounded"
                onClick={() => fieldRefs.current['colourVision-os']?.startEditing()}
              >
                <span className="text-[#8B8B8B] text-sm">OS:</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableText
                    ref={(el) => { fieldRefs.current['colourVision-os'] = el; }}
                    value={(data?.colourVision?.os as string) || ''}
                    onSave={(val) => setField(['colourVision', 'os'], val)}
                    className="text-white text-sm"
                    isEditable={isEditable}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Image Upload for Both Pachymetry and Colour Vision */}
        {isEditable && (
          <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4 mb-6">
            <label className="block text-[#D4A574] text-xl font-semibold mb-3">Upload Pachymetry & Colour Vision Images</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#D4A574] rounded-lg cursor-pointer bg-[#1a1a1a] hover:bg-[#252525] transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-[#D4A574]" />
                  <p className="text-sm text-[#8B8B8B]">
                    <span className="font-semibold text-[#D4A574]">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-1">PNG, JPG, JPEG, PDF (Max 5MB)</p>
                </div>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                  onChange={(e) => {
                    void handlePachymetryAndColourVisionUpload(e);
                  }}
                  className="hidden"
                />
              </label>
            </div>
            {renderDocumentActions(data?.pachymetry)}
          </div>
        )}
      </div>

      {/* General Images Upload */}
      <div>
        <h4 className="text-[#D4A574] text-xl mb-3">Additional Images</h4>
        <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4">
          {isEditable ? (
            <div>
              <label className="block text-[#8B8B8B] text-xl mb-3">Upload Images:</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    void handleAdditionalImagesUpload(files);
                  }
                }}
                className="w-full px-3 py-2 bg-[#121212] border border-[#D4A574] rounded text-white text-xs cursor-pointer"
              />
              <p className="text-[#8B8B8B] text-xs mt-2">Supported formats: JPG, PNG, GIF, WebP</p>
              {additionalImageRefs.length > 0 && (
                <div className="mt-2 space-y-2">
                  {additionalImageRefs.map((documentRef, index) => (
                    <div key={`${documentRef.documentId || documentRef.name || 'img'}-${index}`}>
                      {renderDocumentActions(documentRef)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            additionalImageRefs.length > 0 ? (
              <div className="space-y-2">
                {additionalImageRefs.map((documentRef, index) => (
                  <div key={`${documentRef.documentId || documentRef.name || 'img'}-${index}`}>
                    {renderDocumentActions(documentRef)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#8B8B8B] text-sm">
                {(typeof data?.additionalImages === 'string' && data.additionalImages) || 'No images uploaded'}
              </p>
            )
          )}
        </div>
      </div>

      {/* Abbreviations Guide */}
      <div className="bg-[#0a0a0a] border border-[#D4A574] rounded-lg p-4">
        <h5 className="text-[#8B8B8B] text-xl mb-2">Abbreviations</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="text-white">• CMT: Central Macular Thickness</p>
          <p className="text-white">• RNFL: Retinal Nerve Fiber Layer</p>
          <p className="text-white">• GCL: Ganglion Cell Layer</p>
          <p className="text-white">• MD: Mean Deviation</p>
          <p className="text-white">• PSD: Pattern Standard Deviation</p>
          <p className="text-white">• VFI: Visual Field Index</p>
          <p className="text-white">• OD: Right Eye (Oculus Dexter)</p>
          <p className="text-white">• OS: Left Eye (Oculus Sinister)</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ExpandableCard title="Ophthalmological Investigations" expandedContent={expandedContent}>
        {cardContent}
      </ExpandableCard>
      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewFile}
        fileType={previewType}
        fileName={previewName}
      />
    </>
  );
}