import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout" style={{ display: 'flex', height: '100vh' }}>
      <nav className="sidebar">
        <h1 style={{ marginBottom: '30px', fontSize: '20px' }}>nself-tv</h1>
        <NavLink to="/" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          Search
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          Library
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          Settings
        </NavLink>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
