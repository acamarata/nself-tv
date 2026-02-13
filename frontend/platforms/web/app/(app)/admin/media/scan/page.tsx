'use client';

import { useState, useCallback, useRef } from 'react';
import {
  FolderSearch,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ScanStatus } from '@/types/admin';

function generateScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function MediaScanPage() {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [scanPath, setScanPath] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = useCallback(
    (type: 'full' | 'path', path?: string) => {
      // Stop any existing scan simulation
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const totalFiles = type === 'full' ? 247 : 42;
      const scanId = generateScanId();

      const newScan: ScanStatus = {
        scanId,
        status: 'pending',
        type,
        path: path || undefined,
        totalFiles,
        filesProcessed: 0,
        errors: [],
        startedAt: new Date().toISOString(),
      };

      setScanStatus(newScan);

      // Simulate pending -> scanning transition
      setTimeout(() => {
        setScanStatus((prev) =>
          prev && prev.scanId === scanId
            ? { ...prev, status: 'scanning' }
            : prev,
        );

        // Simulate progress over 3 seconds
        const stepMs = 100;
        const totalSteps = 30;
        const filesPerStep = totalFiles / totalSteps;
        let step = 0;

        intervalRef.current = setInterval(() => {
          step += 1;
          const processed = Math.min(
            totalFiles,
            Math.round(filesPerStep * step),
          );

          // Add a mock error halfway through
          const mockErrors =
            step === Math.floor(totalSteps / 2)
              ? ['Failed to read metadata for: /media/corrupted-file.mkv']
              : [];

          setScanStatus((prev) => {
            if (!prev || prev.scanId !== scanId) return prev;
            return {
              ...prev,
              filesProcessed: processed,
              errors: [...prev.errors, ...mockErrors],
            };
          });

          if (step >= totalSteps) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            setScanStatus((prev) =>
              prev && prev.scanId === scanId
                ? {
                    ...prev,
                    status: 'completed',
                    filesProcessed: totalFiles,
                    completedAt: new Date().toISOString(),
                  }
                : prev,
            );
          }
        }, stepMs);
      }, 500);
    },
    [],
  );

  const handleFullScan = useCallback(() => {
    startScan('full');
  }, [startScan]);

  const handlePathScan = useCallback(() => {
    if (!scanPath.trim()) return;
    startScan('path', scanPath.trim());
  }, [scanPath, startScan]);

  const isScanning =
    scanStatus?.status === 'pending' || scanStatus?.status === 'scanning';

  const progressPercent =
    scanStatus && scanStatus.totalFiles > 0
      ? Math.round(
          (scanStatus.filesProcessed / scanStatus.totalFiles) * 100,
        )
      : 0;

  const statusIcon = (status: ScanStatus['status'] | undefined) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-text-tertiary" />;
      case 'scanning':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const statusLabel = (status: ScanStatus['status'] | undefined) => {
    switch (status) {
      case 'pending':
        return 'Preparing scan...';
      case 'scanning':
        return 'Scanning library...';
      case 'completed':
        return 'Scan completed';
      case 'failed':
        return 'Scan failed';
      default:
        return '';
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-6">
        Library Scan
      </h2>

      {/* Full Library Scan */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <FolderSearch className="w-5 h-5 text-text-tertiary" />
          <h3 className="text-lg font-medium text-text-primary">
            Full Library Scan
          </h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Scan all configured media directories for new, modified, or removed
          files.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={handleFullScan}
          isLoading={isScanning && scanStatus?.type === 'full'}
          disabled={isScanning}
        >
          Full Library Scan
        </Button>
      </div>

      {/* Path-Specific Scan */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-medium text-text-primary mb-3">
          Scan Specific Path
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Scan a specific directory for media files.
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              placeholder="/media/movies"
              disabled={isScanning}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePathScan}
            isLoading={isScanning && scanStatus?.type === 'path'}
            disabled={isScanning || !scanPath.trim()}
          >
            Scan Path
          </Button>
        </div>
      </div>

      {/* Scan Status */}
      {scanStatus && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            {statusIcon(scanStatus.status)}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {statusLabel(scanStatus.status)}
              </p>
              <p className="text-xs text-text-tertiary">
                {scanStatus.type === 'full' ? 'Full library scan' : `Path: ${scanStatus.path}`}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>
                {scanStatus.filesProcessed} / {scanStatus.totalFiles} files
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  scanStatus.status === 'failed'
                    ? 'bg-red-500'
                    : scanStatus.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-primary'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Errors */}
          {scanStatus.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-500 mb-2">
                Errors ({scanStatus.errors.length})
              </h4>
              <ul className="space-y-1">
                {scanStatus.errors.map((error, index) => (
                  <li
                    key={index}
                    className="text-xs text-red-400 bg-red-500/10 rounded px-3 py-2"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamps */}
          <div className="mt-4 flex gap-4 text-xs text-text-tertiary">
            <span>Started: {new Date(scanStatus.startedAt).toLocaleTimeString()}</span>
            {scanStatus.completedAt && (
              <span>Completed: {new Date(scanStatus.completedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
