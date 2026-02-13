'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { UploadProgress } from '@/types/admin';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function generateId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function MediaUploadPage() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUploads: UploadProgress[] = Array.from(files).map((file) => ({
      id: generateId(),
      filename: file.name,
      size: file.size,
      bytesUploaded: 0,
      status: 'pending' as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addFiles],
  );

  const simulateUpload = useCallback((uploadId: string, fileSize: number) => {
    const stepMs = 100;
    const totalSteps = 20; // 2 seconds total
    const bytesPerStep = fileSize / totalSteps;
    let step = 0;

    setUploads((prev) =>
      prev.map((u) =>
        u.id === uploadId ? { ...u, status: 'uploading' as const } : u,
      ),
    );

    const interval = setInterval(() => {
      step += 1;
      const bytesUploaded = Math.min(fileSize, Math.round(bytesPerStep * step));

      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId ? { ...u, bytesUploaded } : u,
        ),
      );

      if (step >= totalSteps) {
        clearInterval(interval);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadId
              ? { ...u, bytesUploaded: fileSize, status: 'processing' as const }
              : u,
          ),
        );

        // Simulate processing for 1 second
        setTimeout(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: 'complete' as const } : u,
            ),
          );
        }, 1000);
      }
    }, stepMs);
  }, []);

  const handleUploadAll = useCallback(() => {
    const pendingUploads = uploads.filter((u) => u.status === 'pending');
    pendingUploads.forEach((upload) => {
      simulateUpload(upload.id, upload.size);
    });
  }, [uploads, simulateUpload]);

  const pendingCount = uploads.filter((u) => u.status === 'pending').length;

  const statusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return <File className="w-4 h-4 text-text-tertiary" />;
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const statusLabel = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'uploading':
        return 'Uploading';
      case 'processing':
        return 'Processing';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-6">
        Media Upload
      </h2>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-text-tertiary'
        }`}
      >
        <Upload className="w-10 h-10 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-primary font-medium mb-2">
          Drag and drop media files here
        </p>
        <p className="text-text-secondary text-sm mb-4">
          Supports video and audio files
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Browse Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* File List */}
      {uploads.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">
              Files ({uploads.length})
            </h3>
            {pendingCount > 0 && (
              <Button type="button" variant="primary" onClick={handleUploadAll}>
                Upload All ({pendingCount})
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {uploads.map((upload) => {
              const progressPercent =
                upload.size > 0
                  ? Math.round((upload.bytesUploaded / upload.size) * 100)
                  : 0;

              return (
                <div
                  key={upload.id}
                  className="bg-surface border border-border rounded-lg p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {statusIcon(upload.status)}
                    <span className="text-sm font-medium text-text-primary flex-1 truncate">
                      {upload.filename}
                    </span>
                    <span className="text-xs text-text-tertiary whitespace-nowrap">
                      {formatBytes(upload.size)}
                    </span>
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {statusLabel(upload.status)}
                    </span>
                  </div>

                  {(upload.status === 'uploading' || upload.status === 'processing') && (
                    <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          upload.status === 'processing'
                            ? 'bg-yellow-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}

                  {upload.status === 'uploading' && (
                    <p className="text-xs text-text-tertiary mt-1">
                      {formatBytes(upload.bytesUploaded)} / {formatBytes(upload.size)} ({progressPercent}%)
                    </p>
                  )}

                  {upload.status === 'error' && upload.error && (
                    <p className="text-xs text-red-500 mt-1">{upload.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
