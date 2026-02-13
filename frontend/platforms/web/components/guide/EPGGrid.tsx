'use client';

import { useRef, useCallback } from 'react';
import { ProgramCell } from './ProgramCell';
import { ChannelSidebar } from './ChannelSidebar';
import type { LiveChannel, Program } from '@/types/dvr';

/** Pixels per 30-minute time slot */
const SLOT_WIDTH = 200;
/** Duration of one slot in milliseconds */
const SLOT_DURATION_MS = 30 * 60 * 1000;

export interface EPGGridProps {
  /** Channels to display as rows */
  channels: LiveChannel[];
  /** All programs to place on the grid */
  programs: Program[];
  /** Start of the visible time window (ISO string) */
  timeStart: string;
  /** Number of 30-min slots to render */
  slotCount: number;
  /** Currently selected channel ID */
  selectedChannelId?: string;
  /** Called when a channel sidebar row is clicked */
  onChannelClick?: (channel: LiveChannel) => void;
  /** Called when a program cell is clicked */
  onProgramClick: (program: Program) => void;
}

/**
 * EPG (Electronic Program Guide) grid with time header, channel sidebar, and program cells.
 *
 * Renders channels as rows and 30-minute time slots as columns. Programs span
 * across slots proportionally to their duration.
 */
function EPGGrid({
  channels,
  programs,
  timeStart,
  slotCount,
  selectedChannelId,
  onChannelClick,
  onProgramClick,
}: EPGGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const timeStartMs = new Date(timeStart).getTime();
  const now = Date.now();

  const totalWidth = slotCount * SLOT_WIDTH;

  /** Generate time slot labels */
  const timeSlots: { label: string; timestamp: number }[] = [];
  for (let i = 0; i < slotCount; i++) {
    const ts = timeStartMs + i * SLOT_DURATION_MS;
    const date = new Date(ts);
    timeSlots.push({
      label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: ts,
    });
  }

  /** Calculate program position and width for a given channel */
  const getProgramLayout = useCallback(
    (program: Program) => {
      const pStart = new Date(program.startTime).getTime();
      const pEnd = new Date(program.endTime).getTime();
      const visibleStart = Math.max(pStart, timeStartMs);
      const visibleEnd = Math.min(pEnd, timeStartMs + slotCount * SLOT_DURATION_MS);

      if (visibleStart >= visibleEnd) return null;

      const leftPx = ((visibleStart - timeStartMs) / SLOT_DURATION_MS) * SLOT_WIDTH;
      const widthPx = ((visibleEnd - visibleStart) / SLOT_DURATION_MS) * SLOT_WIDTH;

      return { left: leftPx, width: Math.max(widthPx, 40) };
    },
    [timeStartMs, slotCount],
  );

  /** Whether "now" falls within a program's time */
  const isAiringNow = (program: Program): boolean => {
    const pStart = new Date(program.startTime).getTime();
    const pEnd = new Date(program.endTime).getTime();
    return now >= pStart && now < pEnd;
  };

  /** Current time indicator position */
  const nowIndicatorLeft = (() => {
    if (now < timeStartMs || now > timeStartMs + slotCount * SLOT_DURATION_MS) return null;
    return ((now - timeStartMs) / SLOT_DURATION_MS) * SLOT_WIDTH;
  })();

  return (
    <div className="flex border border-border rounded-lg overflow-hidden bg-background" data-testid="epg-grid">
      {/* Channel sidebar */}
      <ChannelSidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onChannelClick={onChannelClick}
      />

      {/* Scrollable grid area */}
      <div className="flex-1 overflow-x-auto" ref={gridRef}>
        <div style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}>
          {/* Time header */}
          <div className="flex h-10 border-b border-border sticky top-0 bg-surface z-10">
            {timeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 flex items-center px-2 border-r border-border text-xs text-text-tertiary"
                style={{ width: `${SLOT_WIDTH}px` }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {/* Program rows */}
          <div className="relative">
            {channels.map((channel) => {
              const channelPrograms = programs.filter((p) => p.channelId === channel.id);

              return (
                <div
                  key={channel.id}
                  className="relative h-12 border-b border-border"
                  data-testid={`channel-row-${channel.id}`}
                >
                  {channelPrograms.map((program) => {
                    const layout = getProgramLayout(program);
                    if (!layout) return null;

                    return (
                      <div
                        key={program.id}
                        className="absolute top-0 h-full py-0.5"
                        style={{ left: `${layout.left}px` }}
                      >
                        <ProgramCell
                          program={program}
                          width={layout.width}
                          isCurrentlyAiring={isAiringNow(program)}
                          onClick={onProgramClick}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Current time indicator */}
            {nowIndicatorLeft != null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: `${nowIndicatorLeft}px` }}
                data-testid="now-indicator"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { EPGGrid, SLOT_WIDTH, SLOT_DURATION_MS };
