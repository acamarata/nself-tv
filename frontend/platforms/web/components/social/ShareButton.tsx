'use client';

import { useState } from 'react';

export interface ShareButtonProps {
  contentId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  className?: string;
}

export function ShareButton({
  contentId,
  title,
  description,
  imageUrl,
  url,
  className = '',
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || `${window.location.origin}/content/${contentId}`;
  const shareText = description || `Check out ${title} on nself-tv`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        setShowMenu(false);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const handleFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const handleEmail = () => {
    const emailUrl = `mailto:?subject=${encodeURIComponent(
      title
    )}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.location.href = emailUrl;
    setShowMenu(false);
  };

  const handleWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      `${shareText} ${shareUrl}`
    )}`;
    window.open(whatsappUrl, '_blank');
    setShowMenu(false);
  };

  return (
    <div className={`share-button ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="share-trigger"
        aria-label="Share content"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 6.667a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM5 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM15 18.333a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M7.083 11.25l5.834 3.417M12.917 5.333L7.083 8.75"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <span>Share</span>
      </button>

      {showMenu && (
        <>
          <div className="share-overlay" onClick={() => setShowMenu(false)} />
          <div className="share-menu">
            {navigator.share && (
              <button onClick={handleNativeShare} className="share-option">
                <span className="icon">📱</span>
                <span>Share via...</span>
              </button>
            )}

            <button onClick={handleCopyLink} className="share-option">
              <span className="icon">{copied ? '✓' : '🔗'}</span>
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button onClick={handleTwitter} className="share-option">
              <span className="icon">𝕏</span>
              <span>Twitter</span>
            </button>

            <button onClick={handleFacebook} className="share-option">
              <span className="icon">f</span>
              <span>Facebook</span>
            </button>

            <button onClick={handleWhatsApp} className="share-option">
              <span className="icon">💬</span>
              <span>WhatsApp</span>
            </button>

            <button onClick={handleEmail} className="share-option">
              <span className="icon">✉️</span>
              <span>Email</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
