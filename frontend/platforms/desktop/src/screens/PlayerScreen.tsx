import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export function PlayerScreen() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        src={`http://localhost:8080/media/${mediaId}/stream`}
      />

      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '15px 20px',
        borderRadius: '8px'
      }}>
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
        <h2 style={{ margin: 0 }}>Media {mediaId}</h2>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 40,
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        <button
          className="button"
          onClick={handlePlayPause}
          style={{ width: '64px', height: '64px', borderRadius: '50%', fontSize: '24px' }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
}
