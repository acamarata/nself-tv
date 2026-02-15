import { CheckCircle, XCircle, Rss } from 'lucide-react';
import type { FeedValidation } from '@/types/acquisition';

interface FeedPreviewProps {
  validation: FeedValidation | null;
  isLoading: boolean;
}

export function FeedPreview({ validation, isLoading }: FeedPreviewProps) {
  if (isLoading) {
    return (
      <div className="p-4 bg-surface border border-border rounded-lg" data-testid="feed-preview-loading">
        <div className="flex items-center gap-2 text-text-secondary">
          <Rss className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Validating feed...</span>
        </div>
      </div>
    );
  }

  if (!validation) return null;

  return (
    <div className="p-4 bg-surface border border-border rounded-lg" data-testid="feed-preview">
      <div className="flex items-center gap-2 mb-3">
        {validation.valid ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <span className={`text-sm font-medium ${validation.valid ? 'text-green-500' : 'text-red-500'}`}>
          {validation.valid ? 'Valid Feed' : 'Invalid Feed'}
        </span>
      </div>

      {validation.title && (
        <p className="text-sm font-medium text-text-primary mb-2">{validation.title}</p>
      )}

      {validation.valid && (
        <p className="text-xs text-text-secondary mb-3">{validation.itemCount} items found</p>
      )}

      {validation.errors.length > 0 && (
        <div className="space-y-1 mb-3">
          {validation.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-500">{err}</p>
          ))}
        </div>
      )}

      {validation.sampleItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary">Sample items:</p>
          {validation.sampleItems.slice(0, 3).map((item, i) => (
            <div key={i} className="text-xs p-2 bg-surface-hover rounded">
              <p className="font-medium text-text-primary truncate">{item.title}</p>
              <p className="text-text-tertiary mt-0.5">
                {item.quality} &middot; {new Date(item.publishedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
