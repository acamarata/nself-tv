'use client';

import { useState, useEffect } from 'react';
import { downloadManager, type DownloadItem } from '@/lib/offline/download-manager';
import { storageManager } from '@/lib/offline/storage-manager';

export interface DownloadButtonProps {
  contentId: string;
  title: string;
  url: string;
  size?: number;
  className?: string;
}

export function DownloadButton({
  contentId,
  title,
  url,
  size,
  className = '',
}: DownloadButtonProps) {
  const [downloadItem, setDownloadItem] = useState<DownloadItem | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasSpace, setHasSpace] = useState(true);

  useEffect(() => {
    // Check if already downloaded
    downloadManager.isAvailableOffline(url).then(setIsAvailable);

    // Check if in download queue
    const existing = downloadManager
      .getAll()
      .find((item) => item.contentId === contentId);
    if (existing) {
      setDownloadItem(existing);
    }

    // Check storage space
    if (size) {
      storageManager.hasSpace(size).then(setHasSpace);
    }
  }, [contentId, url, size]);

  useEffect(() => {
    if (!downloadItem) return;

    // Listen for progress updates
    const handleProgress = () => {
      const updated = downloadManager.get(downloadItem.id);
      if (updated) {
        setDownloadItem(updated);

        if (updated.status === 'completed') {
          setIsAvailable(true);
        }
      }
    };

    downloadManager.onProgress(downloadItem.id, handleProgress);

    return () => {
      downloadManager.offProgress(downloadItem.id);
    };
  }, [downloadItem?.id]);

  const handleDownload = async () => {
    if (!hasSpace && size) {
      alert('Not enough storage space available');
      return;
    }

    const id = await downloadManager.add(contentId, title, url);
    const item = downloadManager.get(id);
    if (item) {
      setDownloadItem(item);
    }
  };

  const handlePause = async () => {
    if (downloadItem) {
      await downloadManager.pause(downloadItem.id);
      const updated = downloadManager.get(downloadItem.id);
      if (updated) {
        setDownloadItem(updated);
      }
    }
  };

  const handleResume = async () => {
    if (downloadItem) {
      await downloadManager.resume(downloadItem.id);
      const updated = downloadManager.get(downloadItem.id);
      if (updated) {
        setDownloadItem(updated);
      }
    }
  };

  const handleRemove = async () => {
    if (downloadItem) {
      await downloadManager.remove(downloadItem.id);
      setDownloadItem(null);
      setIsAvailable(false);
    }
  };

  const handleTogglePin = async () => {
    if (downloadItem) {
      await downloadManager.setPin(downloadItem.id, !downloadItem.pinned);
      const updated = downloadManager.get(downloadItem.id);
      if (updated) {
        setDownloadItem(updated);
      }
    }
  };

  if (isAvailable) {
    return (
      <button
        onClick={handleRemove}
        className={`download-button available ${className}`}
        aria-label="Remove download"
      >
        <span className="icon">✓</span>
        <span className="label">Downloaded</span>
        {downloadItem?.pinned && <span className="pin-icon">📌</span>}
      </button>
    );
  }

  if (downloadItem) {
    const { status, progress } = downloadItem;

    if (status === 'downloading') {
      return (
        <button
          onClick={handlePause}
          className={`download-button downloading ${className}`}
          aria-label="Pause download"
        >
          <span className="progress-ring">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#333"
                strokeWidth="2"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#00ff00"
                strokeWidth="2"
                strokeDasharray={`${progress * 0.628} 62.8`}
                transform="rotate(-90 12 12)"
              />
            </svg>
          </span>
          <span className="label">{progress}%</span>
        </button>
      );
    }

    if (status === 'paused') {
      return (
        <button
          onClick={handleResume}
          className={`download-button paused ${className}`}
          aria-label="Resume download"
        >
          <span className="icon">▶</span>
          <span className="label">Resume ({progress}%)</span>
        </button>
      );
    }

    if (status === 'queued') {
      return (
        <button
          onClick={handlePause}
          className={`download-button queued ${className}`}
          aria-label="Cancel download"
        >
          <span className="icon">⏸</span>
          <span className="label">Queued</span>
        </button>
      );
    }

    if (status === 'failed') {
      return (
        <button
          onClick={handleDownload}
          className={`download-button failed ${className}`}
          aria-label="Retry download"
        >
          <span className="icon">⚠</span>
          <span className="label">Retry</span>
        </button>
      );
    }
  }

  return (
    <button
      onClick={handleDownload}
      className={`download-button ${!hasSpace ? 'disabled' : ''} ${className}`}
      disabled={!hasSpace}
      aria-label="Download for offline viewing"
    >
      <span className="icon">⬇</span>
      <span className="label">Download</span>
      {!hasSpace && <span className="warning">No space</span>}
    </button>
  );
}
