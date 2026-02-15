'use client';

import { useState } from 'react';
import { useRatings, useRatingStats, useMarkRatingHelpful } from '@/hooks/useRatings';

export interface ReviewsListProps {
  contentId: string;
}

export function ReviewsList({ contentId }: ReviewsListProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('helpful');
  const { data: reviews, isLoading } = useRatings(contentId, sortBy);
  const { data: stats } = useRatingStats(contentId);
  const markHelpful = useMarkRatingHelpful();

  const handleMarkHelpful = (ratingId: string, helpful: boolean) => {
    markHelpful.mutate({ ratingId, helpful });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="reviews-list">
      {stats && (
        <div className="rating-summary">
          <div className="average-rating">
            <div className="score">{stats.averageRating.toFixed(1)}</div>
            <div className="stars">
              {'★'.repeat(Math.round(stats.averageRating / 2))}
              {'☆'.repeat(5 - Math.round(stats.averageRating / 2))}
            </div>
            <div className="count">{stats.totalRatings} ratings</div>
          </div>

          <div className="rating-bars">
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
              const count = stats.distribution[rating as keyof typeof stats.distribution] || 0;
              const percentage =
                stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;

              return (
                <div key={rating} className="rating-bar">
                  <span className="rating-label">{rating}</span>
                  <div className="bar-container">
                    <div className="bar-fill" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="reviews-header">
        <h3>Reviews</h3>
        <div className="sort-buttons">
          <button
            onClick={() => setSortBy('helpful')}
            className={sortBy === 'helpful' ? 'active' : ''}
          >
            Most Helpful
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={sortBy === 'recent' ? 'active' : ''}
          >
            Most Recent
          </button>
          <button
            onClick={() => setSortBy('rating')}
            className={sortBy === 'rating' ? 'active' : ''}
          >
            Highest Rating
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading reviews...</div>
      ) : reviews && reviews.length > 0 ? (
        <div className="reviews">
          {reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="user-info">
                  {review.user.avatarUrl && (
                    <img
                      src={review.user.avatarUrl}
                      alt={review.user.displayName}
                      className="avatar"
                    />
                  )}
                  <div>
                    <div className="user-name">{review.user.displayName}</div>
                    <div className="review-date">{formatDate(review.createdAt)}</div>
                  </div>
                </div>

                <div className="review-rating">
                  <span className="rating-value">{review.rating}</span>
                  <span className="rating-max">/10</span>
                </div>
              </div>

              <div className="review-text">{review.reviewText}</div>

              <div className="review-actions">
                <button
                  onClick={() => handleMarkHelpful(review.id, true)}
                  className="helpful-btn"
                  disabled={markHelpful.isPending}
                >
                  👍 Helpful ({review.helpful})
                </button>
                <button
                  onClick={() => handleMarkHelpful(review.id, false)}
                  className="helpful-btn"
                  disabled={markHelpful.isPending}
                >
                  👎 Not helpful ({review.notHelpful})
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No reviews yet. Be the first to review!</p>
        </div>
      )}

      <style jsx>{`
        .reviews-list {
          margin-top: 2rem;
        }

        .rating-summary {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 2rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .average-rating {
          text-align: center;
        }

        .score {
          font-size: 3rem;
          font-weight: 700;
          color: #ffd700;
        }

        .stars {
          font-size: 1.5rem;
          color: #ffd700;
          margin: 0.5rem 0;
        }

        .count {
          color: #888;
          font-size: 0.9rem;
        }

        .rating-bars {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .rating-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .rating-label {
          width: 20px;
          text-align: right;
          font-size: 0.9rem;
          color: #888;
        }

        .bar-container {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: #ffd700;
          transition: width 0.3s;
        }

        .rating-count {
          width: 40px;
          text-align: right;
          font-size: 0.9rem;
          color: #888;
        }

        .reviews-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .reviews-header h3 {
          font-size: 1.5rem;
        }

        .sort-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .sort-buttons button {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #fff;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sort-buttons button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .sort-buttons button.active {
          background: #4a9eff;
          border-color: #4a9eff;
        }

        .reviews {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .review-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .review-date {
          font-size: 0.85rem;
          color: #888;
        }

        .review-rating {
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .rating-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffd700;
        }

        .rating-max {
          font-size: 1rem;
          color: #888;
        }

        .review-text {
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 1rem;
        }

        .review-actions {
          display: flex;
          gap: 1rem;
        }

        .helpful-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 0.5rem 1rem;
          color: #fff;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .helpful-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
        }

        .helpful-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #888;
        }

        @media (max-width: 768px) {
          .rating-summary {
            grid-template-columns: 1fr;
          }

          .reviews-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .sort-buttons {
            width: 100%;
            flex-wrap: wrap;
          }

          .sort-buttons button {
            flex: 1;
            min-width: 100px;
          }
        }
      `}</style>
    </div>
  );
}
