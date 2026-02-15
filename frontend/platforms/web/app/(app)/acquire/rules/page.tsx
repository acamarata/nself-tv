'use client';

import { useState } from 'react';
import { Plus, Trash2, Shield, GripVertical, Bell, Download, SkipForward } from 'lucide-react';
import type { DownloadRule, RuleAction, QualityProfile, CreateRuleRequest } from '@/types/acquisition';

const ACTION_CONFIG: Record<RuleAction, { label: string; icon: React.ReactNode; color: string }> = {
  auto_download: { label: 'Auto Download', icon: <Download className="w-3 h-3" />, color: 'bg-green-500/10 text-green-500' },
  notify: { label: 'Notify', icon: <Bell className="w-3 h-3" />, color: 'bg-blue-500/10 text-blue-500' },
  skip: { label: 'Skip', icon: <SkipForward className="w-3 h-3" />, color: 'bg-gray-500/10 text-gray-400' },
};

const MOCK_RULES: DownloadRule[] = [
  { id: 'r1', familyId: 'f1', name: 'Prefer 4K Remux', priority: 1, conditions: { quality: ['remux', 'bluray'], minSize: 10737418240 }, action: 'auto_download', enabled: true, createdAt: '2026-01-01', updatedAt: '2026-02-14' },
  { id: 'r2', familyId: 'f1', name: 'Skip CAM Releases', priority: 2, conditions: { titleContains: ['CAM', 'TS', 'HDCAM'] }, action: 'skip', enabled: true, createdAt: '2026-01-05', updatedAt: '2026-02-14' },
  { id: 'r3', familyId: 'f1', name: 'Notify on 1080p WEB-DL', priority: 3, conditions: { quality: ['web-dl'], resolution: '1080p' }, action: 'notify', enabled: true, createdAt: '2026-01-10', updatedAt: '2026-02-14' },
  { id: 'r4', familyId: 'f1', name: 'Auto-grab Balanced', priority: 4, conditions: { quality: ['web-dl', 'webrip', 'bluray'], maxSize: 8589934592 }, action: 'auto_download', enabled: false, createdAt: '2026-01-15', updatedAt: '2026-02-10' },
  { id: 'r5', familyId: 'f1', name: 'Skip Low Quality', priority: 5, conditions: { quality: ['hdtv'], maxSize: 536870912 }, action: 'skip', enabled: true, createdAt: '2026-02-01', updatedAt: '2026-02-14' },
];

function conditionsPreview(conditions: Record<string, unknown>): string {
  const parts: string[] = [];
  if (conditions.quality) parts.push(`Quality: ${(conditions.quality as string[]).join(', ')}`);
  if (conditions.titleContains) parts.push(`Contains: ${(conditions.titleContains as string[]).join(', ')}`);
  if (conditions.resolution) parts.push(`Resolution: ${conditions.resolution}`);
  if (conditions.minSize) parts.push(`Min: ${((conditions.minSize as number) / 1073741824).toFixed(0)} GB`);
  if (conditions.maxSize) parts.push(`Max: ${((conditions.maxSize as number) / 1073741824).toFixed(0)} GB`);
  return parts.join(' | ') || 'No conditions';
}

export default function RulesPage() {
  const [showForm, setShowForm] = useState(false);
  const [rules, setRules] = useState(MOCK_RULES);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPriority, setFormPriority] = useState(rules.length + 1);
  const [formAction, setFormAction] = useState<RuleAction>('auto_download');
  const [formQuality, setFormQuality] = useState('');
  const [formTitleContains, setFormTitleContains] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const conditions: Record<string, unknown> = {};
    if (formQuality.trim()) conditions.quality = formQuality.split(',').map((s) => s.trim());
    if (formTitleContains.trim()) conditions.titleContains = formTitleContains.split(',').map((s) => s.trim());

    const _params: CreateRuleRequest = {
      name: formName,
      priority: formPriority,
      conditions,
      action: formAction,
    };
    // Will wire to useDownloadRules hook when plugins ready
    setShowForm(false);
    setFormName('');
    setFormPriority(rules.length + 1);
    setFormAction('auto_download');
    setFormQuality('');
    setFormTitleContains('');
  };

  const toggleEnabled = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDelete = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Download Rules</h1>
        <button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">New Download Rule</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ruleName" className="block text-sm font-medium text-text-secondary mb-1">Rule Name</label>
                <input
                  id="ruleName"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Prefer 4K Remux"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="rulePriority" className="block text-sm font-medium text-text-secondary mb-1">Priority</label>
                <input
                  id="rulePriority"
                  type="number"
                  min={1}
                  value={formPriority}
                  onChange={(e) => setFormPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ruleAction" className="block text-sm font-medium text-text-secondary mb-1">Action</label>
              <select
                id="ruleAction"
                value={formAction}
                onChange={(e) => setFormAction(e.target.value as RuleAction)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="auto_download">Auto Download</option>
                <option value="notify">Notify Only</option>
                <option value="skip">Skip</option>
              </select>
            </div>
            <div>
              <label htmlFor="ruleQuality" className="block text-sm font-medium text-text-secondary mb-1">Quality (comma-separated)</label>
              <input
                id="ruleQuality"
                type="text"
                value={formQuality}
                onChange={(e) => setFormQuality(e.target.value)}
                placeholder="e.g. remux, bluray, web-dl"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="ruleTitleContains" className="block text-sm font-medium text-text-secondary mb-1">Title Contains (comma-separated)</label>
              <input
                id="ruleTitleContains"
                type="text"
                value={formTitleContains}
                onChange={(e) => setFormTitleContains(e.target.value)}
                placeholder="e.g. CAM, TS, HDCAM"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                Create Rule
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {rules.length > 0 ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50">
                <th className="w-10 px-2 py-3" />
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Priority</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Action</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Conditions</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Enabled</th>
                <th className="text-right px-4 py-3 text-text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const actionCfg = ACTION_CONFIG[rule.action];
                return (
                  <tr key={rule.id} className={`border-b border-border hover:bg-surface-hover transition-colors ${!rule.enabled ? 'opacity-50' : ''}`} data-testid={`rule-row-${rule.id}`}>
                    <td className="px-2 py-3 text-center">
                      <GripVertical className="w-4 h-4 text-text-tertiary mx-auto cursor-grab" />
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{rule.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{rule.priority}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionCfg.color}`}>
                        {actionCfg.icon}
                        {actionCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-tertiary text-xs max-w-[250px] truncate" title={conditionsPreview(rule.conditions)}>
                      {conditionsPreview(rule.conditions)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(rule.id)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-surface-hover border border-border'}`}
                        aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.enabled ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-400" aria-label={`Delete ${rule.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="w-16 h-16 text-text-tertiary mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">No download rules</h2>
          <p className="text-text-secondary text-sm">Create rules to automatically filter and prioritize downloads based on quality, size, and other criteria.</p>
        </div>
      )}
    </div>
  );
}
