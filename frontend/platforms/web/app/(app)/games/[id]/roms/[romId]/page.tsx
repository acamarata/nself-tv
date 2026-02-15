'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Play, Save, Star, Download, Share2, Bookmark, Clock, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useROMDetail, useCreateSaveState } from '@/hooks/useGames';
import { EmulatorPlayer } from '@/components/games/EmulatorPlayer';

export default function ROMDetailPage() {
  const params = useParams();
  const router = useRouter();
  const romId = params.romId as string;

  const { data, loading } = useROMDetail(romId);
  const [createSave] = useCreateSaveState();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data?.game_roms_by_pk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-text-secondary text-lg mb-4">ROM not found</p>
        <Button onClick={() => router.push('/games')}>Back to Games</Button>
      </div>
    );
  }

  const rom = data.game_roms_by_pk;
  const system = rom.game_system;

  const handleSaveState = async (slot: number, saveData: Blob) => {
    try {
      // Upload save data to storage
      const formData = new FormData();
      formData.append('file', saveData, `${rom.id}-slot-${slot}.sav`);

      const uploadRes = await fetch('/api/games/saves/upload', {
        method: 'POST',
        body: formData,
      });

      const { url } = await uploadRes.json();

      // Save to database
      await createSave({
        variables: {
          rom_id: rom.id,
          slot,
          data_path: url,
          hash: `${rom.id}-${slot}-${Date.now()}`,
        },
      });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  };

  const handleLoadState = async (slot: number): Promise<Blob | null> => {
    try {
      // Fetch save data from storage
      const response = await fetch(`/api/games/saves/${rom.id}/${slot}`);

      if (!response.ok) return null;

      return await response.blob();
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isPlaying) {
    return (
      <EmulatorPlayer
        romUrl={rom.file_path}
        systemCore={system.core_name}
        onSaveState={handleSaveState}
        onLoadState={handleLoadState}
        onExit={() => setIsPlaying(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[500px] bg-gradient-to-b from-background-dark to-background">
        {/* Cover Art */}
        <div className="absolute inset-0">
          {rom.cover_url ? (
            <img
              src={rom.cover_url}
              alt={rom.title}
              className="w-full h-full object-cover opacity-30"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background-dark" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-end pb-12">
          <div className="flex gap-8 items-end">
            {/* Box Art */}
            <div className="flex-shrink-0">
              {rom.cover_url ? (
                <img
                  src={rom.cover_url}
                  alt={rom.title}
                  className="w-64 h-96 object-cover rounded-lg shadow-2xl"
                />
              ) : (
                <div className="w-64 h-96 bg-surface rounded-lg shadow-2xl flex items-center justify-center">
                  <span className="text-6xl">🎮</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pb-4">
              <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">
                {system.full_name}
              </p>

              <h1 className="text-5xl font-bold text-text-primary mb-4">
                {rom.title}
              </h1>

              <div className="flex items-center gap-4 text-text-secondary mb-6">
                {rom.year && <span>{rom.year}</span>}
                {rom.genre && <span>•</span>}
                {rom.genre && <span>{rom.genre}</span>}
                {rom.publisher && <span>•</span>}
                {rom.publisher && <span>{rom.publisher}</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => setIsPlaying(true)}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Play Now
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => router.push(`/games/${romId}/saves`)}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save States
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleToggleFavorite}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>

                <Button variant="secondary" aria-label="Share">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Description */}
            {rom.description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-4">About</h2>
                <p className="text-text-secondary leading-relaxed">{rom.description}</p>
              </div>
            )}

            {/* Screenshots */}
            {rom.screenshot_urls && rom.screenshot_urls.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Screenshots</h2>
                <div className="grid grid-cols-2 gap-4">
                  {rom.screenshot_urls.map((screenshot: string, index: number) => (
                    <img
                      key={index}
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div>
              <h2 className="text-2xl font-bold text-text-primary mb-4">Controls</h2>
              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-2">D-Pad</p>
                    <p className="text-sm text-text-secondary">Arrow Keys</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-2">A / B</p>
                    <p className="text-sm text-text-secondary">Z / X</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-2">Start</p>
                    <p className="text-sm text-text-secondary">Enter</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-2">Select</p>
                    <p className="text-sm text-text-secondary">Shift</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-text-tertiary">
                    You can also use a gamepad if one is connected to your device
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Details</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">System</p>
                  <p className="text-sm text-text-primary">{system.full_name}</p>
                </div>

                {rom.region && (
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Region</p>
                    <p className="text-sm text-text-primary">{rom.region}</p>
                  </div>
                )}

                {rom.file_size && (
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">File Size</p>
                    <p className="text-sm text-text-primary">{formatFileSize(rom.file_size)}</p>
                  </div>
                )}

                {rom.languages && (
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Languages</p>
                    <p className="text-sm text-text-primary">{rom.languages.join(', ')}</p>
                  </div>
                )}

                {rom.players && (
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Players</p>
                    <p className="text-sm text-text-primary">{rom.players}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Save States */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Save States</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => router.push(`/games/${romId}/saves`)}
                >
                  View All
                </Button>
              </div>

              <div className="space-y-3">
                {rom.save_states && rom.save_states.length > 0 ? (
                  rom.save_states.slice(0, 3).map((save: any) => (
                    <div key={save.id} className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-background-dark rounded flex items-center justify-center flex-shrink-0">
                        <Save className="w-6 h-6 text-text-tertiary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {save.name || `Save Slot ${save.slot}`}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {new Date(save.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-secondary text-center py-4">
                    No save states yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
