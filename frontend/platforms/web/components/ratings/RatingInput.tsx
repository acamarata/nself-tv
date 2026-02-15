'use client';

import { useState } from 'react';
import { useUserRating, useSubmitRating, useDeleteRating } from '@/hooks/useRatings';

export interface RatingInputProps {
  contentId: string;
  contentTitle: string;
  onSubmit?: () => void;
}

export function RatingInput({ contentId, contentTitle, onSubmit }: RatingInputProps) {
  const { data: userRating } = useUserRating(contentId);
  const submitRating = useSubmitRating();
  const deleteRating = useDeleteRating();

  const [rating, setRating] = useState(userRating?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState(userRating?.reviewText || '');
  const [showReviewInput, setShowReviewInput] = useState(!!userRating?.reviewText);

  const handleSubmit = async () => {
    if (rating === 0) return;

    try {
      await submitRating.mutateAsync({
        contentId,
        rating,
        reviewText: reviewText.trim() || undefined,
      });

      onSubmit?.();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  const handleDelete = async () => {
    if (!userRating) return;

    try {
      await deleteRating.mutateAsync({
        ratingId: userRating.id,
        contentId,
      });

      setRating(0);
      setReviewText('');
      setShowReviewInput(false);
    } catch (error) {
      console.error('Failed to delete rating:', error);
    }
  };

  return (
    <div className="rating-input">
      <h3>Rate {contentTitle}</h3>

      <div className="star-rating">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <button
            key={value}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(value)}
            className={`star ${
              value <= (hoverRating || rating) ? 'filled' : 'empty'
            }`}
            aria-label={`Rate ${value} out of 10`}
          >
            ★
          </button>
        ))}
      </div>

      <div className="rating-value">
        {rating > 0 ? `${rating}/10` : 'Select a rating'}
      </div>

      {rating > 0 && (
        <>
          {!showReviewInput && (
            <button
              onClick={() => setShowReviewInput(true)}
              className="add-review-btn"
            >
              + Add a review
            </button>
          )}

          {showReviewInput && (
            <div className="review-input">
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your thoughts about this content (optional)"
                maxLength={1000}
                rows={4}
              />
              <div className="char-count">{reviewText.length}/1000</div>
            </div>
          )}

          <div className="actions">
            <button
              onClick={handleSubmit}
              disabled={submitRating.isPending}
              className="btn-primary"
            >
              {submitRating.isPending
                ? 'Saving...'
                : userRating
                  ? 'Update Rating'
                  : 'Submit Rating'}
            </button>

            {userRating && (
              <button
                onClick={handleDelete}
                disabled={deleteRating.isPending}
                className="btn-secondary"
              >
                {deleteRating.isPending ? 'Deleting...' : 'Delete Rating'}
              </button>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .rating-input {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
        }

        h3 {
          font-size: 1.2rem;
          margin-bottom: 1rem;
        }

        .star-rating {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .star {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #555;
          transition: all 0.2s;
          padding: 0;
        }

        .star.filled {
          color: #ffd700;
        }

        .star:hover {
          transform: scale(1.2);
        }

        .rating-value {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #ffd700;
        }

        .add-review-btn {
          background: none;
          border: 1px dashed rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
          width: 100%;
          margin-bottom: 1rem;
        }

        .add-review-btn:hover {
          border-color: #4a9eff;
          background: rgba(74, 158, 255, 0.1);
        }

        .review-input {
          margin-bottom: 1rem;
        }

        textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 1rem;
          color: #fff;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
        }

        textarea:focus {
          outline: none;
          border-color: #4a9eff;
        }

        .char-count {
          text-align: right;
          font-size: 0.85rem;
          color: #888;
          margin-top: 0.5rem;
        }

        .actions {
          display: flex;
          gap: 1rem;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4a9eff;
          color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
          background: #3a8eef;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
