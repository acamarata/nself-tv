'use client';

import { useState } from 'react';
import { Plus, Trash2, FlaskConical } from 'lucide-react';
import type { RuleAction, CreateRuleRequest } from '@/types/acquisition';

const CONDITION_FIELDS = [
  { value: 'genre', label: 'Genre' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
  { value: 'quality', label: 'Quality' },
];

const OPERATORS = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>=', label: 'greater or equal' },
  { value: '<=', label: 'less or equal' },
];

const ACTIONS: { value: RuleAction; label: string }[] = [
  { value: 'auto_download', label: 'Auto-download' },
  { value: 'notify', label: 'Notify only' },
  { value: 'skip', label: 'Skip' },
];

interface Condition { field: string; operator: string; value: string; }

interface RuleBuilderProps {
  onSubmit: (params: CreateRuleRequest) => Promise<void>;
  onCancel: () => void;
  onTest?: (conditions: Record<string, unknown>) => Promise<{ matches: boolean; action: string }>;
}

function conditionsToJsonLogic(conditions: Condition[]): Record<string, unknown> {
  if (conditions.length === 0) return { '==': [true, true] };
  if (conditions.length === 1) {
    const c = conditions[0];
    return { [c.operator]: [{ var: c.field }, isNaN(Number(c.value)) ? c.value : Number(c.value)] };
  }
  return {
    and: conditions.map((c) => ({
      [c.operator]: [{ var: c.field }, isNaN(Number(c.value)) ? c.value : Number(c.value)],
    })),
  };
}

export function RuleBuilder({ onSubmit, onCancel, onTest }: RuleBuilderProps) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(50);
  const [action, setAction] = useState<RuleAction>('auto_download');
  const [conditions, setConditions] = useState<Condition[]>([{ field: 'genre', operator: '==', value: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ matches: boolean; action: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addCondition = () => setConditions([...conditions, { field: 'genre', operator: '==', value: '' }]);
  const removeCondition = (idx: number) => setConditions(conditions.filter((_, i) => i !== idx));
  const updateCondition = (idx: number, updates: Partial<Condition>) => {
    setConditions(conditions.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), priority, conditions: conditionsToJsonLogic(conditions), action });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    try {
      const result = await onTest(conditionsToJsonLogic(conditions));
      setTestResult(result);
    } catch {
      setTestResult(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="rule-builder">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Rule Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Auto-download Sci-Fi" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Priority (1-100)</label>
        <input type="number" min={1} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-20 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">Conditions</label>
        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2" data-testid={`condition-row-${i}`}>
              <select value={cond.field} onChange={(e) => updateCondition(i, { field: e.target.value })} className="px-2 py-1.5 bg-surface border border-border rounded text-sm text-text-primary">
                {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={cond.operator} onChange={(e) => updateCondition(i, { operator: e.target.value })} className="px-2 py-1.5 bg-surface border border-border rounded text-sm text-text-primary">
                {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="text" value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder="Value" className="flex-1 px-2 py-1.5 bg-surface border border-border rounded text-sm text-text-primary" />
              {conditions.length > 1 && (
                <button type="button" onClick={() => removeCondition(i)} className="p-1 text-red-500 hover:text-red-400" aria-label="Remove condition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addCondition} className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
          <Plus className="w-3 h-3" /> Add condition
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Action</label>
        <select value={action} onChange={(e) => setAction(e.target.value as RuleAction)} className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary">
          {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      {onTest && (
        <div>
          <button type="button" onClick={handleTest} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
            <FlaskConical className="w-4 h-4" /> Test rule
          </button>
          {testResult && (
            <p className={`text-xs mt-1 ${testResult.matches ? 'text-green-500' : 'text-text-tertiary'}`}>
              {testResult.matches ? `Match! Action: ${testResult.action}` : 'No match'}
            </p>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isSubmitting || !name.trim()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors">
          {isSubmitting ? 'Creating...' : 'Create Rule'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-hover transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
