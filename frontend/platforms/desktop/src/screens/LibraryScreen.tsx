import React from 'react';

export function LibraryScreen() {
  return (
    <div className="screen">
      <h1 className="screen-title">Library</h1>

      <div className="section">
        <h2 className="section-title">Downloads</h2>
        <p className="placeholder">Downloaded content will appear here</p>
      </div>

      <div className="section">
        <h2 className="section-title">Favorites</h2>
        <p className="placeholder">Favorite content will appear here</p>
      </div>

      <div className="section">
        <h2 className="section-title">Watch Later</h2>
        <p className="placeholder">Saved content will appear here</p>
      </div>
    </div>
  );
}
