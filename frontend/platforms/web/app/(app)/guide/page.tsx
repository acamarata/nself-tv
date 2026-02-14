'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { EPGGrid, SLOT_WIDTH, SLOT_DURATION_MS } from '@/components/guide/EPGGrid';
import { ProgramModal } from '@/components/guide/ProgramModal';
import { useEPG } from '@/hooks/useEPG';
import { useAuth } from '@/hooks/useAuth';
import * as RecordingClient from '@/lib/plugins/recording-client';
import type { Program } from '@/types/dvr';

const RECORDING_BASE_URL = process.env.NEXT_PUBLIC_RECORDING_URL || 'http://localhost:3602';

/** Number of 30-min slots to show (48 = 24 hours) */
const VISIBLE_SLOTS = 48;

export default function GuidePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const {
    channels,
    programs,
    isLoading,
    error,
    refetch,
  } = useEPG({
    refreshInterval: 300000, // 5 minutes
    daysAhead: 3,
  });

  const baseTime = useMemo(() => {
    const now = new Date();
    // Round down to nearest 30 minutes
    now.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);
    // Start 2 hours before now
    now.setHours(now.getHours() - 2);
    return now;
  }, []);

  // Extract unique genres from channels
  const genres = useMemo(() => {
    const genreSet = new Set(channels.map((ch) => ch.genre));
    return Array.from(genreSet).sort();
  }, [channels]);

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [genreFilter, setGenreFilter] = useState<string>('All');
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const filteredChannels = useMemo(() => {
    if (genreFilter === 'All') return channels;
    return channels.filter((ch) => ch.genre === genreFilter);
  }, [channels, genreFilter]);

  const scrollToNow = useCallback(() => {
    const gridEl = gridScrollRef.current;
    if (!gridEl) return;
    const scrollContainer = gridEl.querySelector('[class*="overflow-x-auto"]');
    if (!scrollContainer) return;

    const now = Date.now();
    const baseTimeMs = baseTime.getTime();
    const nowOffset = ((now - baseTimeMs) / SLOT_DURATION_MS) * SLOT_WIDTH;
    scrollContainer.scrollLeft = Math.max(0, nowOffset - 200);
  }, [baseTime]);

  const handleTune = useCallback((program: Program) => {
    setSelectedProgram(null);
    // Navigate to live player for this channel
    router.push(`/watch/live/${program.channelId}`);
  }, [router]);

  const handleRecord = useCallback(async (program: Program) => {
    setSelectedProgram(null);
    setRecordingError(null);
    if (!user?.id) {
      setRecordingError('You must be signed in to schedule recordings.');
      return;
    }
    try {
      const familyId = user.id;
      await RecordingClient.scheduleRecording(
        program.id,
        program.channelId,
        familyId,
        RECORDING_BASE_URL
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to schedule recording';
      setRecordingError(message);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Loading state
  if (isLoading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-lg text-text-secondary">Loading program guide...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2 text-text-primary">Failed to Load Guide</h2>
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Retry
          </button>
          <p className="text-xs text-text-tertiary mt-4">
            Make sure the EPG plugin is running at localhost:3031
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Channel Guide</h1>

        <div className="flex items-center gap-3">
          {/* Genre filter */}
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Filter by genre"
          >
            <option value="All">All Genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-surface border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
            aria-label="Refresh guide data"
            title="Refresh guide data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Now button */}
          <button
            type="button"
            onClick={scrollToNow}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            aria-label="Scroll to current time"
          >
            <Clock className="w-4 h-4" />
            Now
          </button>
        </div>
      </div>

      {/* Error banner (if error but data exists from previous fetch) */}
      {error && channels.length > 0 && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-primary font-medium">Failed to refresh guide</p>
            <p className="text-xs text-text-secondary mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Recording error banner */}
      {recordingError && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-text-primary font-medium">Recording failed</p>
            <p className="text-xs text-text-secondary mt-1">{recordingError}</p>
          </div>
          <button
            type="button"
            onClick={() => setRecordingError(null)}
            className="text-text-secondary hover:text-text-primary text-sm"
            aria-label="Dismiss recording error"
          >
            &times;
          </button>
        </div>
      )}

      {/* EPG Grid */}
      <div ref={gridScrollRef}>
        <EPGGrid
          channels={filteredChannels}
          programs={programs}
          timeStart={baseTime.toISOString()}
          slotCount={VISIBLE_SLOTS}
          onProgramClick={setSelectedProgram}
        />
      </div>

      {/* Program Detail Modal */}
      <ProgramModal
        program={selectedProgram}
        onClose={() => setSelectedProgram(null)}
        onTune={handleTune}
        onRecord={handleRecord}
      />
    </div>
  );
}
