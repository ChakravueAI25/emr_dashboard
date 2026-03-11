import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileType: 'pdf' | 'video' | 'image' | 'other';
  fileName: string;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileType,
  fileName,
}: DocumentPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !fileUrl) return null;

  const renderPreview = () => {
    if (fileType === 'image') {
      return <img src={fileUrl} alt={fileName} className="max-h-[75vh] max-w-full object-contain rounded-lg" />;
    }

    if (fileType === 'pdf') {
      return <iframe src={fileUrl} title={fileName} className="h-[75vh] w-full rounded-lg border border-[var(--theme-border)] bg-white" />;
    }

    if (fileType === 'video') {
      return <video controls src={fileUrl} className="max-h-[75vh] max-w-full rounded-lg bg-black" />;
    }

    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-6 text-center text-[var(--theme-text-muted)]">
        Preview not supported
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${fileName}`}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-secondary)] p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-[var(--theme-text)]">{fileName}</h3>
            <p className="text-xs uppercase tracking-wider text-[var(--theme-text-muted)]">Document Preview</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--theme-border)] p-2 text-[var(--theme-text-muted)] transition-colors hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-center">{renderPreview()}</div>
      </div>
    </div>
  );
}