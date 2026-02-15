'use client';

import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Lock, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const CREATE_ACCESS_REQUEST_MUTATION = gql`
  mutation CreateAccessRequest($mediaItemId: uuid!, $message: String) {
    insert_content_approval_requests_one(
      object: {
        media_item_id: $mediaItemId
        request_message: $message
      }
    ) {
      id
      requested_at
      status
    }
  }
`;

const CHECK_EXISTING_REQUEST_QUERY = gql`
  query CheckExistingRequest($mediaItemId: uuid!) {
    content_approval_requests(
      where: {
        media_item_id: { _eq: $mediaItemId }
        status: { _eq: "pending" }
      }
      limit: 1
    ) {
      id
      requested_at
      status
    }
  }
`;

interface RequestAccessButtonProps {
  mediaItemId: string;
  mediaTitle: string;
  contentRating: string | null;
  onRequestSent?: () => void;
  className?: string;
}

export function RequestAccessButton({
  mediaItemId,
  mediaTitle,
  contentRating,
  onRequestSent,
  className = '',
}: RequestAccessButtonProps) {
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const [createRequest, { loading }] = useMutation(CREATE_ACCESS_REQUEST_MUTATION, {
    onCompleted: () => {
      setRequestSent(true);
      setShowMessageInput(false);
      setMessage('');
      onRequestSent?.();
    },
    onError: (error) => {
      console.error('Failed to create access request:', error);
      alert('Failed to send request. Please try again.');
    },
  });

  const handleRequestAccess = async () => {
    if (!showMessageInput) {
      setShowMessageInput(true);
      return;
    }

    await createRequest({
      variables: {
        mediaItemId,
        message: message || `I would like to watch "${mediaTitle}"`,
      },
    });
  };

  if (requestSent) {
    return (
      <div className={`flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg ${className}`}>
        <CheckCircle className="h-5 w-5 text-green-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-500">Request Sent</p>
          <p className="text-xs text-text-muted mt-1">
            A parent will review your request soon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-start gap-3 p-4 bg-surface border border-border rounded-lg">
        <Lock className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">Content Restricted</p>
          <p className="text-xs text-text-muted mt-1">
            This {contentRating ? `${contentRating} rated` : ''} content is above your current rating limit.
            {' '}You can request access from a parent.
          </p>
        </div>
      </div>

      {showMessageInput && (
        <div className="space-y-2">
          <label htmlFor="request-message" className="text-sm font-medium text-text-primary">
            Add a message (optional)
          </label>
          <textarea
            id="request-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`I would like to watch "${mediaTitle}"`}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={3}
            disabled={loading}
          />
        </div>
      )}

      <Button
        onClick={handleRequestAccess}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        <Send className="h-5 w-5 mr-2" />
        {showMessageInput ? 'Send Request' : 'Request Access'}
      </Button>

      {showMessageInput && (
        <button
          type="button"
          onClick={() => {
            setShowMessageInput(false);
            setMessage('');
          }}
          className="w-full text-sm text-text-muted hover:text-text-primary transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
