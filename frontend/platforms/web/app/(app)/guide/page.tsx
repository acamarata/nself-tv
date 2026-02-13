'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { EPGGrid, SLOT_WIDTH, SLOT_DURATION_MS } from '@/components/guide/EPGGrid';
import { ProgramModal } from '@/components/guide/ProgramModal';
import type { LiveChannel, Program } from '@/types/dvr';

// ---- Mock Data ----

const MOCK_GENRES = ['News', 'Sports', 'Movie', 'Comedy', 'Drama', 'Documentary', 'Kids', 'Music'];

function makeMockChannels(): LiveChannel[] {
  const channels: { number: string; name: string; genre: string }[] = [
    { number: '2', name: 'WCBS', genre: 'News' },
    { number: '4', name: 'WNBC', genre: 'News' },
    { number: '5', name: 'FOX 5', genre: 'Drama' },
    { number: '7', name: 'WABC', genre: 'News' },
    { number: '9', name: 'WWOR', genre: 'Comedy' },
    { number: '11', name: 'WPIX', genre: 'Sports' },
    { number: '13', name: 'WNET', genre: 'Documentary' },
    { number: '21', name: 'WLIW', genre: 'Kids' },
    { number: '25', name: 'WNYE', genre: 'Music' },
    { number: '31', name: 'WPXN', genre: 'Movie' },
  ];

  return channels.map((ch, i) => ({
    id: `ch-${ch.number}`,
    number: ch.number,
    name: ch.name,
    logoUrl: null,
    genre: ch.genre,
    signalQuality: 75 + Math.floor(Math.random() * 25),
    isFavorite: i < 3,
  }));
}

function makeMockPrograms(channels: LiveChannel[], baseTime: Date): Program[] {
  const programs: Program[] = [];
  const titles: Record<string, string[]> = {
    News: ['Morning News', 'Noon Report', 'Evening Update', 'World Tonight', 'Local at 10', 'Weather Hour'],
    Sports: ['NFL Gameday', 'NBA Courtside', 'SportsCenter', 'MLB Tonight', 'Soccer Live', 'Tennis Open'],
    Movie: ['Action Blast', 'Romantic Comedy', 'Sci-Fi Marathon', 'Classic Film', 'Thriller Night', 'Drama Special'],
    Comedy: ['Sitcom Hour', 'Stand-Up Show', 'Comedy Central', 'Laugh Track', 'Fun Night', 'Jokes Live'],
    Drama: ['Crime Files', 'Hospital Drama', 'Legal Eagles', 'Mystery Hour', 'Dark Secrets', 'Family Ties'],
    Documentary: ['Nature World', 'History Revealed', 'Science Hour', 'True Crime', 'Travel Now', 'Tech Today'],
    Kids: ['Cartoon Time', 'Adventure Hour', 'Learning Fun', 'Animal Friends', 'Story Time', 'Play Zone'],
    Music: ['Top Hits', 'Concert Live', 'Jazz Night', 'Rock Hour', 'Classical FM', 'Indie Sessions'],
  };

  // Generate 3 days of programming for each channel
  for (const channel of channels) {
    let currentTime = new Date(baseTime);
    const endDate = new Date(baseTime);
    endDate.setDate(endDate.getDate() + 3);

    let programIndex = 0;
    while (currentTime < endDate) {
      const durationMinutes = [30, 60, 90, 120][Math.floor(Math.random() * 4)];
      const endTime = new Date(currentTime.getTime() + durationMinutes * 60000);
      const genreTitles = titles[channel.genre] ?? titles.Drama;
      const title = genreTitles[programIndex % genreTitles.length];

      const isLive = channel.genre === 'Sports' && Math.random() < 0.15;
      const isNew = Math.random() < 0.2;

      programs.push({
        id: `prog-${channel.id}-${programIndex}`,
        channelId: channel.id,
        title,
        description: `${title} on ${channel.name}. Enjoy this ${channel.genre.toLowerCase()} program.`,
        startTime: currentTime.toISOString(),
        endTime: endTime.toISOString(),
        genre: channel.genre,
        isNew,
        isLive,
        seasonNumber: channel.genre === 'Drama' ? 3 : undefined,
        episodeNumber: channel.genre === 'Drama' ? programIndex + 1 : undefined,
      });

      currentTime = endTime;
      programIndex++;
    }
  }

  return programs;
}

// ---- Component ----

/** Number of 30-min slots to show (48 = 24 hours) */
const VISIBLE_SLOTS = 48;

export default function GuidePage() {
  const channels = useMemo(() => makeMockChannels(), []);

  const baseTime = useMemo(() => {
    const now = new Date();
    // Round down to nearest 30 minutes
    now.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0);
    // Start 2 hours before now
    now.setHours(now.getHours() - 2);
    return now;
  }, []);

  const programs = useMemo(() => makeMockPrograms(channels, baseTime), [channels, baseTime]);

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
    // In a real app, this would navigate to the live player for this channel
  }, []);

  const handleRecord = useCallback((program: Program) => {
    setSelectedProgram(null);
    // In a real app, this would schedule a DVR recording
  }, []);

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
            {MOCK_GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>

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
