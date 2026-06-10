import { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon, FileText } from 'lucide-react';

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

interface FilePreview {
  file: File;
  url: string;
  name: string;
  size: string;
}

export default function ImageUploader({ onFilesSelected, maxFiles = 10 }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) =>
      ['image/jpeg', 'image/png', 'image/jpg'].includes(f.type)
    );
    if (files.length === 0) return;

    const limited = files.slice(0, maxFiles - previews.length);
    const newPreviews: FilePreview[] = limited.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: formatSize(file.size),
    }));

    const updated = [...previews, ...newPreviews].slice(0, maxFiles);
    setPreviews(updated);
    onFilesSelected(updated.map((p) => p.file));
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onFilesSelected(updated.map((p) => p.file));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div
        className={`upload-zone ${isDragging ? 'upload-zone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <div className="upload-zone__icon">
          <Upload size={48} />
        </div>
        <div className="upload-zone__text">
          {isDragging ? 'Drop images here' : 'Drag & drop site photos or click to upload'}
        </div>
        <div className="upload-zone__hint">
          Supports JPG, JPEG, PNG • Max {maxFiles} files • EXIF data will be extracted
        </div>
      </div>

      {previews.length > 0 && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <ImageIcon size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
              {previews.length} file{previews.length > 1 ? 's' : ''} selected
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                previews.forEach((p) => URL.revokeObjectURL(p.url));
                setPreviews([]);
                onFilesSelected([]);
              }}
            >
              Clear all
            </button>
          </div>
          <div className="upload-zone__previews" style={{ justifyContent: 'flex-start' }}>
            {previews.map((preview, idx) => (
              <div key={idx} className="upload-zone__preview" style={{ width: '120px', height: '120px' }}>
                <img src={preview.url} alt={preview.name} />
                <button
                  className="upload-zone__preview-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                >
                  <X size={12} />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.7)',
                    padding: '4px 6px',
                    fontSize: '10px',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <FileText size={10} />
                  {preview.size}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
