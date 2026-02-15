'use client';

import { useState, useEffect } from 'react';
import { useGlobalShortcuts, formatShortcut } from '@/hooks/useKeyboardShortcuts';

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const shortcuts = useGlobalShortcuts();

  useEffect(() => {
    const handleShow = () => setIsOpen(true);
    window.addEventListener('show-keyboard-shortcuts', handleShow);
    return () => window.removeEventListener('show-keyboard-shortcuts', handleShow);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button onClick={() => setIsOpen(false)} data-close-modal>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {shortcuts.map((group) => (
            <div key={group.name} className="shortcut-group">
              <h3>{group.name}</h3>
              <div className="shortcuts-list">
                {group.shortcuts.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <span className="shortcut-description">{shortcut.description}</span>
                    <kbd className="shortcut-keys">{formatShortcut(shortcut)}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="help-text">
            <p>
              <strong>Tip:</strong> Press <kbd>?</kbd> anytime to show this help
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
        }

        .modal {
          background: #1a1a1a;
          border-radius: 12px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .modal-header button {
          background: none;
          border: none;
          color: #fff;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .modal-header button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .shortcut-group {
          margin-bottom: 2rem;
        }

        .shortcut-group:last-of-type {
          margin-bottom: 1rem;
        }

        .shortcut-group h3 {
          font-size: 1.1rem;
          margin-bottom: 1rem;
          color: #4a9eff;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .shortcuts-list {
          display: grid;
          gap: 0.75rem;
        }

        .shortcut-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          transition: background 0.2s;
        }

        .shortcut-item:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .shortcut-description {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.95rem;
        }

        .shortcut-keys {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          padding: 0.35rem 0.75rem;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Courier New', monospace;
          font-size: 0.85rem;
          color: #fff;
          font-weight: 500;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        kbd {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Courier New', monospace;
          font-size: 0.85rem;
          color: #fff;
          font-weight: 500;
        }

        .help-text {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
        }

        .help-text p {
          color: #888;
          font-size: 0.9rem;
        }

        .help-text strong {
          color: #fff;
        }

        @media (max-width: 768px) {
          .modal {
            max-width: 100%;
            border-radius: 0;
            max-height: 100vh;
          }

          .shortcut-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .shortcut-keys {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
