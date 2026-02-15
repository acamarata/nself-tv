'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrivacySettingsPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportData = async () => {
    setIsExporting(true);
    setError(null);

    try {
      // Get auth token from session
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/gdpr/export', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }

      // Download the JSON file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nself-tv-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/gdpr/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmation: 'DELETE MY ACCOUNT',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Deletion failed');
      }

      // Clear local storage and redirect
      localStorage.clear();
      sessionStorage.clear();

      // Clear service worker cache
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Redirect to homepage with message
      router.push('/?deleted=true');
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="privacy-settings">
      <h1>Privacy & Data</h1>
      <p className="subtitle">Manage your personal data and privacy settings</p>

      {error && (
        <div className="error-banner">
          <span className="icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <section className="section">
        <h2>Your Rights (GDPR)</h2>
        <p>
          You have the right to access, export, and delete your personal data at any time.
        </p>

        <div className="actions-grid">
          {/* Data Export */}
          <div className="action-card">
            <div className="icon-large">📦</div>
            <h3>Download My Data</h3>
            <p>
              Export all your personal data in JSON format. Includes watch history,
              watchlist, ratings, preferences, and more.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="btn-primary"
            >
              {isExporting ? (
                <>
                  <span className="spinner" />
                  Exporting...
                </>
              ) : (
                <>
                  <span>📥</span>
                  Export Data
                </>
              )}
            </button>
          </div>

          {/* Account Deletion */}
          <div className="action-card danger">
            <div className="icon-large">🗑️</div>
            <h3>Delete My Account</h3>
            <p>
              Permanently delete your account and all associated data. This action is
              <strong> irreversible</strong>.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn-danger"
            >
              <span>⚠️</span>
              Delete Account
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Privacy Settings</h2>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Personalized Recommendations</h3>
            <p>Use watch history to suggest content</p>
          </div>
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Share Watch Activity</h3>
            <p>Allow friends to see what you&apos;re watching</p>
          </div>
          <label className="toggle">
            <input type="checkbox" />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Analytics</h3>
            <p>Help improve the service with anonymized usage data</p>
          </div>
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="slider" />
          </label>
        </div>
      </section>

      <section className="section">
        <h2>Data Retention</h2>

        <div className="retention-info">
          <div className="retention-item">
            <strong>Watch History:</strong>
            <span>Kept until manually cleared or account deletion</span>
          </div>
          <div className="retention-item">
            <strong>Access Logs:</strong>
            <span>30 days (security purposes)</span>
          </div>
          <div className="retention-item">
            <strong>Error Logs:</strong>
            <span>7 days (anonymized)</span>
          </div>
          <div className="retention-item">
            <strong>Deleted Account Data:</strong>
            <span>Purged within 30 days</span>
          </div>
        </div>

        <button className="btn-secondary">Clear Watch History</button>
      </section>

      <section className="section">
        <h2>Legal</h2>
        <div className="legal-links">
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>
          <a href="mailto:privacy@nself.org">Contact Privacy Team</a>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Delete Account</h2>
              <button onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p className="warning">
                <strong>This action is permanent and cannot be undone.</strong>
              </p>

              <p>The following data will be permanently deleted:</p>
              <ul>
                <li>Your account and profile</li>
                <li>Watch history and progress</li>
                <li>Watchlist and favorites</li>
                <li>All ratings and reviews</li>
                <li>Preferences and settings</li>
                <li>Downloaded offline content</li>
                <li>Watch party participation</li>
              </ul>

              <p>
                To confirm, type <strong>DELETE MY ACCOUNT</strong> below:
              </p>

              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type here..."
                className="confirmation-input"
                autoFocus
              />

              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE MY ACCOUNT' || isDeleting}
                  className="btn-danger"
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Forever'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .privacy-settings {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #888;
          margin-bottom: 2rem;
        }

        .error-banner {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .error-banner .icon {
          font-size: 1.5rem;
        }

        .error-banner button {
          margin-left: auto;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          font-size: 1.2rem;
        }

        .section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .section h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .action-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
        }

        .action-card.danger {
          border-color: rgba(220, 38, 38, 0.3);
        }

        .icon-large {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .action-card h3 {
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
        }

        .action-card p {
          color: #aaa;
          margin-bottom: 1.5rem;
        }

        .btn-primary,
        .btn-secondary,
        .btn-danger {
          width: 100%;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4a9eff;
          color: #fff;
        }

        .btn-primary:hover:not(:disabled) {
          background: #3a8eef;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .btn-danger {
          background: rgba(220, 38, 38, 0.8);
          color: #fff;
        }

        .btn-danger:hover:not(:disabled) {
          background: rgba(220, 38, 38, 1);
        }

        .btn-primary:disabled,
        .btn-secondary:disabled,
        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-info h3 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .setting-info p {
          font-size: 0.875rem;
          color: #888;
        }

        .toggle {
          position: relative;
          width: 50px;
          height: 26px;
          display: inline-block;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.2);
          transition: 0.3s;
          border-radius: 26px;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 18px;
          width: 18px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #4a9eff;
        }

        input:checked + .slider:before {
          transform: translateX(24px);
        }

        .retention-info {
          margin: 1rem 0 1.5rem;
        }

        .retention-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .retention-item:last-child {
          border-bottom: none;
        }

        .retention-item strong {
          color: #fff;
        }

        .retention-item span {
          color: #888;
        }

        .legal-links {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .legal-links a {
          color: #4a9eff;
          text-decoration: none;
        }

        .legal-links a:hover {
          text-decoration: underline;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: #1a1a1a;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
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
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-body .warning {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .modal-body ul {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .modal-body li {
          margin-bottom: 0.5rem;
          color: #aaa;
        }

        .confirmation-input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: #fff;
          font-size: 1rem;
          margin: 1rem 0;
        }

        .confirmation-input:focus {
          outline: none;
          border-color: #4a9eff;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .modal-actions button {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
