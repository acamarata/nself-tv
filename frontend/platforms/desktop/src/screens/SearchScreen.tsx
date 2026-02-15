import React, { useState } from 'react';

export function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <div className="screen">
      <h1 className="screen-title">Search</h1>

      <div style={{ marginBottom: '30px' }}>
        <input
          className="input"
          type="text"
          placeholder="Search media..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query ? (
        <p className="placeholder">Search results will appear here</p>
      ) : (
        <div className="section">
          <h2 className="section-title">Popular Searches</h2>
          <p className="placeholder">Popular content will appear here</p>
        </div>
      )}
    </div>
  );
}
