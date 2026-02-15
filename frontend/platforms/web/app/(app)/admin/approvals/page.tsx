'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { CheckCircle, XCircle, Clock, User, Film } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

const GET_PENDING_APPROVALS = gql`
  query GetPendingApprovals {
    pending_approval_requests {
      id
      profile_id
      media_item_id
      requested_at
      request_message
      requester_name
      requester_avatar
      requester_rating_limit
      media_title
      media_type
      media_rating
      media_poster
      media_overview
    }
  }
`;

const APPROVE_REQUEST_MUTATION = gql`
  mutation ApproveRequest($id: uuid!, $reviewMessage: String) {
    update_content_approval_requests_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: "approved"
        review_message: $reviewMessage
      }
    ) {
      id
      status
      reviewed_at
    }
  }
`;

const DENY_REQUEST_MUTATION = gql`
  mutation DenyRequest($id: uuid!, $reviewMessage: String) {
    update_content_approval_requests_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: "denied"
        review_message: $reviewMessage
      }
    ) {
      id
      status
      reviewed_at
    }
  }
`;

const BATCH_APPROVE_MUTATION = gql`
  mutation BatchApproveRequests($ids: [uuid!]!) {
    update_content_approval_requests(
      where: { id: { _in: $ids } }
      _set: { status: "approved" }
    ) {
      affected_rows
    }
  }
`;

interface ApprovalRequest {
  id: string;
  profile_id: string;
  media_item_id: string;
  requested_at: string;
  request_message: string | null;
  requester_name: string;
  requester_avatar: string | null;
  requester_rating_limit: string;
  media_title: string;
  media_type: string;
  media_rating: string | null;
  media_poster: string | null;
  media_overview: string | null;
}

export default function ApprovalsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(GET_PENDING_APPROVALS, {
    pollInterval: 30000, // Poll every 30 seconds
  });

  const [approve, { loading: approving }] = useMutation(APPROVE_REQUEST_MUTATION, {
    onCompleted: () => {
      refetch();
      setReviewingId(null);
      setReviewMessage('');
    },
  });

  const [deny, { loading: denying }] = useMutation(DENY_REQUEST_MUTATION, {
    onCompleted: () => {
      refetch();
      setReviewingId(null);
      setReviewMessage('');
    },
  });

  const [batchApprove, { loading: batchApproving }] = useMutation(BATCH_APPROVE_MUTATION, {
    onCompleted: () => {
      refetch();
      setSelectedIds(new Set());
    },
  });

  const requests: ApprovalRequest[] = data?.pending_approval_requests || [];

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleApprove = async (id: string) => {
    await approve({
      variables: {
        id,
        reviewMessage: reviewMessage || 'Approved',
      },
    });
  };

  const handleDeny = async (id: string) => {
    await deny({
      variables: {
        id,
        reviewMessage: reviewMessage || 'Denied',
      },
    });
  };

  const handleBatchApprove = async () => {
    await batchApprove({
      variables: {
        ids: Array.from(selectedIds),
      },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Content Approvals</h1>
          <p className="text-sm text-text-muted mt-1">
            Review and approve content access requests from family members
          </p>
        </div>

        {selectedIds.size > 0 && (
          <Button
            onClick={handleBatchApprove}
            disabled={batchApproving}
            size="lg"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Approve Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-lg border border-border">
          <Clock className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <p className="text-lg font-medium text-text-primary">No Pending Requests</p>
          <p className="text-sm text-text-muted mt-2">
            All content access requests have been reviewed
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-surface border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex gap-4">
                {/* Selection checkbox */}
                <div className="flex items-start pt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(request.id)}
                    onChange={() => toggleSelection(request.id)}
                    className="w-4 h-4 text-primary bg-surface-hover border-border rounded focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Media poster */}
                <div className="relative w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-surface-hover">
                  {request.media_poster ? (
                    <Image
                      src={request.media_poster}
                      alt={request.media_title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="h-8 w-8 text-text-muted" />
                    </div>
                  )}
                </div>

                {/* Request details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-text-primary">
                        {request.media_title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-text-muted">
                        <span className="capitalize">{request.media_type.replace('_', ' ')}</span>
                        {request.media_rating && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-xs">
                              {request.media_rating}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-text-muted">{formatDate(request.requested_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm mb-3">
                    {request.requester_avatar ? (
                      <Image
                        src={request.requester_avatar}
                        alt={request.requester_name}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    ) : (
                      <User className="h-5 w-5 text-text-muted" />
                    )}
                    <span className="text-text-secondary">
                      <span className="font-medium">{request.requester_name}</span>
                      {' '} ({request.requester_rating_limit} limit)
                    </span>
                  </div>

                  {request.request_message && (
                    <p className="text-sm text-text-secondary italic mb-3 p-2 bg-surface-hover rounded border border-border">
                      "{request.request_message}"
                    </p>
                  )}

                  {reviewingId === request.id ? (
                    <div className="space-y-2 mt-3">
                      <input
                        type="text"
                        value={reviewMessage}
                        onChange={(e) => setReviewMessage(e.target.value)}
                        placeholder="Add a message (optional)"
                        className="w-full px-3 py-2 bg-surface-hover border border-border rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          disabled={approving}
                          size="sm"
                          variant="primary"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleDeny(request.id)}
                          disabled={denying}
                          size="sm"
                          variant="secondary"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setReviewMessage('');
                          }}
                          className="text-sm text-text-muted hover:text-text-primary px-3"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setReviewingId(request.id)}
                        size="sm"
                        variant="primary"
                      >
                        Review
                      </Button>
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={approving}
                        size="sm"
                        variant="secondary"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Quick Approve
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
