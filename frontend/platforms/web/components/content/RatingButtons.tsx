'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { ThumbsUp, ThumbsDown, Heart } from 'lucide-react';

export type UserRatingType = 'thumbs_up' | 'thumbs_down' | 'love' | null;

// Map UI rating types to database values (0-10 scale)
const RATING_VALUES: Record<Exclude<UserRatingType, null>, number> = {
  thumbs_down: 2,
  thumbs_up: 7,
  love: 10,
};

// Reverse map: database value to UI type (with tolerance)
function ratingValueToType(value: number | null): UserRatingType {
  if (value === null) return null;
  if (value <= 3) return 'thumbs_down';
  if (value >= 9) return 'love';
  return 'thumbs_up';
}

const UPSERT_RATING_MUTATION = gql`
  mutation UpsertUserRating($mediaItemId: uuid!, $rating: numeric!) {
    insert_user_ratings_one(
      object: { media_item_id: $mediaItemId, rating: $rating }
      on_conflict: {
        constraint: idx_user_ratings_unique
        update_columns: [rating, updated_at]
      }
    ) {
      id
      rating
      updated_at
    }
  }
`;

const DELETE_RATING_MUTATION = gql`
  mutation DeleteUserRating($mediaItemId: uuid!) {
    delete_user_ratings(where: { media_item_id: { _eq: $mediaItemId } }) {
      affected_rows
    }
  }
`;

interface RatingButtonsProps {
  mediaItemId: string;
  initialRating?: number | null;
  onRatingChange?: (rating: number | null) => void;
  className?: string;
}

export function RatingButtons({
  mediaItemId,
  initialRating = null,
  onRatingChange,
  className = '',
}: RatingButtonsProps) {
  const [currentRating, setCurrentRating] = useState<UserRatingType>(
    ratingValueToType(initialRating),
  );
  const [isAnimating, setIsAnimating] = useState<UserRatingType | null>(null);

  const [upsertRating, { loading: upsertLoading }] = useMutation(UPSERT_RATING_MUTATION, {
    onError: (error) => {
      console.error('Failed to upsert rating:', error);
      // Revert on error
      setCurrentRating(ratingValueToType(initialRating));
    },
  });

  const [deleteRating, { loading: deleteLoading }] = useMutation(DELETE_RATING_MUTATION, {
    onError: (error) => {
      console.error('Failed to delete rating:', error);
      // Revert on error
      setCurrentRating(ratingValueToType(initialRating));
    },
  });

  const loading = upsertLoading || deleteLoading;

  const handleRating = async (type: Exclude<UserRatingType, null>) => {
    // If clicking the same rating, remove it
    if (currentRating === type) {
      // Optimistic update
      setCurrentRating(null);
      setIsAnimating(type);

      try {
        await deleteRating({
          variables: { mediaItemId },
        });
        onRatingChange?.(null);
      } finally {
        setTimeout(() => setIsAnimating(null), 300);
      }
      return;
    }

    // Otherwise, set new rating
    const ratingValue = RATING_VALUES[type];

    // Optimistic update
    setCurrentRating(type);
    setIsAnimating(type);

    try {
      await upsertRating({
        variables: {
          mediaItemId,
          rating: ratingValue,
        },
      });
      onRatingChange?.(ratingValue);
    } finally {
      setTimeout(() => setIsAnimating(null), 300);
    }
  };

  const buttonClass = (type: Exclude<UserRatingType, null>) => {
    const isActive = currentRating === type;
    const isAnimatingThis = isAnimating === type;

    return `
      relative inline-flex items-center justify-center p-2 rounded-lg
      transition-all duration-200 ease-in-out
      ${isActive ? 'bg-primary/20 text-primary scale-110' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'}
      ${isAnimatingThis ? 'animate-bounce' : ''}
      ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900
    `.trim();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} role="group" aria-label="Rate this content">
      <button
        type="button"
        onClick={() => handleRating('thumbs_down')}
        disabled={loading}
        className={buttonClass('thumbs_down')}
        aria-label="Thumbs down"
        aria-pressed={currentRating === 'thumbs_down'}
      >
        <ThumbsDown className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => handleRating('thumbs_up')}
        disabled={loading}
        className={buttonClass('thumbs_up')}
        aria-label="Thumbs up"
        aria-pressed={currentRating === 'thumbs_up'}
      >
        <ThumbsUp className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => handleRating('love')}
        disabled={loading}
        className={buttonClass('love')}
        aria-label="Love this content"
        aria-pressed={currentRating === 'love'}
      >
        <Heart className={`w-5 h-5 ${currentRating === 'love' ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}
