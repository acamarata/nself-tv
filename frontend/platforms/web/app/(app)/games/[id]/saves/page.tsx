'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Save, Trash2, Download, Upload, Clock, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useGameSaveStates, useCreateSaveState, useDeleteSaveState } from '@/hooks/useGames';

export default function GameSavesPage() {
  const params = useParams();
  const router = useRouter();
  const romId = params.id as string;

  const { data, loading, refetch } = useGameSaveStates(romId);
  const [createSave, { loading: creating }] = useCreateSaveState();
  const [deleteSave] = useDeleteSaveState();

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleCreateSave = async (slot: number) => {
    try {
      await createSave({
        variables: {
          rom_id: romId,
          slot,
          data_path: `/api/games/${romId}/saves/${slot}`,
          hash: `${romId}-${slot}-${Date.now()}`,
        },
      });
      refetch();
    } catch (error) {
      console.error('Failed to create save:', error);
    }
  };

  const handleDeleteSave = async (saveId: string) => {
    if (!confirm('Delete this save state? This action cannot be undone.')) return;

    try {
      await deleteSave({
        variables: { id: saveId },
      });
      refetch();
    } catch (error) {
      console.error('Failed to delete save:', error);
    }
  };

  const handleLoadSave = async (saveId: string) => {
    router.push(`/games/${romId}/play?saveId=${saveId}`);
  };

  const handleExportSave = async (save: any) => {
    // Download save state as file
    const blob = await fetch(save.data_path).then(r => r.blob());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(save.name || `Save Slot ${save.slot}`).replace(/\s+/g, '-')}.sav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const saves = data?.game_save_states || [];
  const availableSlots = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Save States</h1>
          <p className="text-text-secondary">Manage your game save states</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push(`/games/${romId}`)}
        >
          Back to Game
        </Button>
      </div>

      {/* Cloud Sync Status */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-8">
        <div className="flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Cloud Sync Enabled</p>
            <p className="text-xs text-text-secondary">Saves automatically sync across all your devices</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-text-primary">{saves.length} / 8 Slots Used</p>
            <p className="text-xs text-text-secondary">
              {formatBytes(saves.reduce((acc: number, save: any) => acc + (save.save_data_size || 0), 0))} Total
            </p>
          </div>
        </div>
      </div>

      {/* Save Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {availableSlots.map(slot => {
          const save = saves.find((s: any) => s.slot === slot);

          return (
            <div
              key={slot}
              className={`bg-surface border-2 rounded-xl overflow-hidden transition-all ${
                selectedSlot === save?.id
                  ? 'border-primary'
                  : 'border-border hover:border-border-hover'
              }`}
              onClick={() => save && setSelectedSlot(save.id)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-background-dark relative">
                {save?.screenshot_path ? (
                  <img
                    src={save.screenshot_path}
                    alt={save.name || `Save Slot ${save.slot}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Save className="w-12 h-12 text-text-tertiary" />
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/80 rounded-full px-3 py-1">
                  <span className="text-xs font-medium text-white">Slot {slot}</span>
                </div>
              </div>

              {/* Save Info */}
              <div className="p-4">
                {save ? (
                  <>
                    <h3 className="text-sm font-semibold text-text-primary mb-1 truncate">
                      {save.name || `Save Slot ${save.slot}`}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-text-secondary mb-3">
                      <Clock className="w-3 h-3" />
                      {new Date(save.created_at).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadSave(save.id);
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 bg-primary hover:bg-primary-hover rounded text-xs font-medium text-white transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        Load
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportSave(save);
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 bg-surface-hover hover:bg-border rounded text-xs font-medium text-text-primary transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSave(save.id);
                        }}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-xs font-medium text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-text-secondary mb-1">
                      Empty Slot
                    </h3>
                    <p className="text-xs text-text-tertiary mb-3">No save data</p>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreateSave(slot)}
                      disabled={creating}
                      className="w-full"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Create Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save History */}
      {saves.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Save History</h2>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background-dark">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Slot</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Size</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {saves.map((save: any) => (
                  <tr key={save.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-sm text-text-primary font-medium">{save.slot}</td>
                    <td className="px-4 py-3 text-sm text-text-primary">{save.name || `Save Slot ${save.slot}`}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {new Date(save.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatBytes(save.save_data_size || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleLoadSave(save.id)}
                          className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleExportSave(save)}
                          className="text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => handleDeleteSave(save.id)}
                          className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
