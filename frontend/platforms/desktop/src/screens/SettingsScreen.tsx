import React, { useState } from 'react';
import { useAuth } from '../services/AuthProvider';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const [autoPlay, setAutoPlay] = useState(true);
  const [downloadQuality, setDownloadQuality] = useState('1080p');

  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>

      {user && (
        <div className="section">
          <h2 className="section-title">Account</h2>
          <p style={{ marginBottom: '10px' }}>
            <strong>Email:</strong> {user.email}
          </p>
          {user.displayName && (
            <p style={{ marginBottom: '20px' }}>
              <strong>Name:</strong> {user.displayName}
            </p>
          )}
          <button
            className="button"
            onClick={logout}
            style={{ background: '#FF3B30' }}
          >
            Logout
          </button>
        </div>
      )}

      <div className="section">
        <h2 className="section-title">Playback</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
          />
          Auto-play next episode
        </label>
      </div>

      <div className="section">
        <h2 className="section-title">Downloads</h2>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          <strong>Download Quality:</strong>
        </label>
        <select
          className="input"
          value={downloadQuality}
          onChange={(e) => setDownloadQuality(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="720p">720p (HD)</option>
          <option value="1080p">1080p (Full HD)</option>
          <option value="2160p">2160p (4K)</option>
        </select>
      </div>

      <div className="section">
        <h2 className="section-title">About</h2>
        <p>
          <strong>Version:</strong> 0.7.0
        </p>
      </div>
    </div>
  );
}
