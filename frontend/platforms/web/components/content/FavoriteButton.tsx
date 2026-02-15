'use client';

import { useState } from 'react';
import { useToggleFavorite, useIsFavorited } from '@/hooks/useFavorites';

export interface FavoriteButtonProps {
  contentId: string;
  profileId?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'button';
  className?: string;
}

export function FavoriteButton({
  contentId,
  profileId,
  showLabel = false,
  size = 'medium',
  variant = 'icon',
  className = '',
}: FavoriteButtonProps) {
  const { data: isFavorited, isLoading } = useIsFavorited(contentId, profileId);
  const toggleFavorite = useToggleFavorite();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async () => {
    setIsAnimating(true);

    try {
      await toggleFavorite.mutateAsync({
        contentId,
        profileId,
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  const iconSize = {
    small: 16,
    medium: 20,
    large: 24,
  }[size];

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || toggleFavorite.isPending}
      className={`favorite-button ${variant} ${size} ${className} ${
        isAnimating ? 'animating' : ''
      }`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="heart-icon"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>

      {showLabel && <span>{isFavorited ? 'Favorited' : 'Favorite'}</span>}

      <style jsx>{`
        .favorite-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          color: rgba(255, 255, 255, 0.7);
        }

        .favorite-button:hover:not(:disabled) {
          color: #ff6b9d;
        }

        .favorite-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .favorite-button.icon {
          padding: 0.5rem;
          border-radius: 50%;
        }

        .favorite-button.icon:hover:not(:disabled) {
          background: rgba(255, 107, 157, 0.1);
        }

        .favorite-button.button {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .favorite-button.button:hover:not(:disabled) {
          background: rgba(255, 107, 157, 0.1);
          border-color: #ff6b9d;
        }

        .favorite-button :global(.heart-icon) {
          transition: all 0.2s;
        }

        .favorite-button:hover :global(.heart-icon) {
          stroke: #ff6b9d;
        }

        .favorite-button.animating :global(.heart-icon) {
          animation: heartbeat 0.6s ease-in-out;
        }

        @keyframes heartbeat {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.3);
          }
          50% {
            transform: scale(1);
          }
          75% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        .favorite-button span {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .favorite-button.small {
          font-size: 0.875rem;
        }

        .favorite-button.large {
          font-size: 1.1rem;
        }
      `}</style>
    </button>
  );
}
