import React from 'react';
import { useNavigate } from 'react-router-dom';

export function HomeScreen() {
  const navigate = useNavigate();

  const handlePlayDemo = () => {
    navigate('/player/demo-1');
  };

  return (
    <div className="screen">
      <h1 className="screen-title">nself-tv</h1>

      <div className="section">
        <h2 className="section-title">Continue Watching</h2>
        <p className="placeholder">Content will appear here</p>
      </div>

      <div className="section">
        <h2 className="section-title">Recommended</h2>
        <p className="placeholder">Content will appear here</p>
      </div>

      <div className="section">
        <h2 className="section-title">Trending</h2>
        <button className="button" onClick={handlePlayDemo}>
          Play Demo Video
        </button>
      </div>
    </div>
  );
}
