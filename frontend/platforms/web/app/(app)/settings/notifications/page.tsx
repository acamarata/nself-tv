'use client';

import { useState, useEffect } from 'react';
import { pushManager } from '@/lib/notifications/push-manager';

export default function NotificationSettingsPage() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  // Notification preferences
  const [preferences, setPreferences] = useState({
    newReleases: true,
    watchPartyInvites: true,
    downloadComplete: true,
    recommendations: true,
    newEpisodes: true,
    contentAvailable: true,
  });

  useEffect(() => {
    async function init() {
      await pushManager.initialize();
      setIsSubscribed(pushManager.isSubscribed());
      setPermission(pushManager.getPermissionStatus());
    }
    init();
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const subscription = await pushManager.subscribe();

      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
      } else {
        setError('Failed to subscribe. Please check browser permissions.');
      }
    } catch (err) {
      console.error('Subscribe error:', err);
      setError(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await pushManager.unsubscribe();
      setIsSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Unsubscribe failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await pushManager.showNotification({
        title: 'Test Notification',
        body: 'This is a test notification from nself-tv!',
        icon: '/icons/icon-192x192.png',
        data: {
          url: '/home',
          type: 'content',
        },
        actions: [
          { action: 'open', title: 'Open App' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });

      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch (err) {
      console.error('Test notification error:', err);
      setError('Failed to send test notification');
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

    // TODO: Save to backend
  };

  return (
    <div className="notification-settings">
      <h1>Notifications</h1>
      <p className="subtitle">Manage push notifications and alerts</p>

      {error && (
        <div className="error-banner">
          <span className="icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Permission Status */}
      <section className="section">
        <h2>Push Notifications</h2>

        <div className="status-card">
          <div className="status-icon">
            {permission === 'granted' && isSubscribed && '✅'}
            {permission === 'granted' && !isSubscribed && '🔔'}
            {permission === 'denied' && '🔕'}
            {permission === 'default' && '❓'}
          </div>

          <div className="status-info">
            <h3>
              {permission === 'granted' && isSubscribed && 'Active'}
              {permission === 'granted' && !isSubscribed && 'Ready'}
              {permission === 'denied' && 'Blocked'}
              {permission === 'default' && 'Not Enabled'}
            </h3>
            <p>
              {permission === 'granted' && isSubscribed &&
                'You will receive push notifications for selected events'}
              {permission === 'granted' && !isSubscribed &&
                'Click subscribe to start receiving notifications'}
              {permission === 'denied' &&
                'Notifications blocked. Please enable in browser settings.'}
              {permission === 'default' &&
                'Enable notifications to stay updated on new content and events'}
            </p>
          </div>

          <div className="status-actions">
            {!isSubscribed && permission !== 'denied' && (
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? 'Subscribing...' : 'Enable Notifications'}
              </button>
            )}

            {isSubscribed && (
              <>
                <button
                  onClick={handleTestNotification}
                  disabled={isLoading}
                  className="btn-secondary"
                >
                  {testSent ? '✓ Sent!' : 'Send Test'}
                </button>
                <button
                  onClick={handleUnsubscribe}
                  disabled={isLoading}
                  className="btn-danger"
                >
                  Disable
                </button>
              </>
            )}

            {permission === 'denied' && (
              <p className="help-text">
                Go to browser settings → Site Settings → Notifications to allow
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Notification Preferences */}
      {isSubscribed && (
        <section className="section">
          <h2>Notification Types</h2>
          <p>Choose which notifications you want to receive</p>

          <div className="preferences">
            <div className="preference-item">
              <div className="preference-info">
                <div className="icon">🎬</div>
                <div>
                  <h3>New Releases</h3>
                  <p>Notify when new movies or shows are added to your library</p>
                </div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={preferences.newReleases}
                  onChange={() => handlePreferenceChange('newReleases')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <div className="icon">📺</div>
                <div>
                  <h3>New Episodes</h3>
                  <p>Notify when new episodes of followed shows are available</p>
                </div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={preferences.newEpisodes}
                  onChange={() => handlePreferenceChange('newEpisodes')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <div className="icon">👥</div>
                <div>
                  <h3>Watch Party Invites</h3>
                  <p>Notify when friends invite you to watch parties</p>
                </div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={preferences.watchPartyInvites}
                  onChange={() => handlePreferenceChange('watchPartyInvites')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <div className="icon">⬇️</div>
                <div>
                  <h3>Download Complete</h3>
                  <p>Notify when offline downloads finish</p>
                </div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={preferences.downloadComplete}
                  onChange={() => handlePreferenceChange('downloadComplete')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <div className="icon">✨</div>
                <div>
                  <h3>Recommendations</h3>
                  <p>Notify about personalized content suggestions</p>
                </div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={preferences.recommendations}
                  onChange={() => handlePreferenceChange('recommendations')}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <div className="icon">📅</div>
                <div>
                  <h3>Content Available</h3>
                  <p>Notify when tracked upcoming content becomes available</p>
                </div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={preferences.contentAvailable}
                  onChange={() => handlePreferenceChange('contentAvailable')}
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </section>
      )}

      {/* Browser Support */}
      <section className="section">
        <h2>Browser Support</h2>
        <div className="support-info">
          <div className="support-item">
            <strong>Service Worker:</strong>
            <span>
              {'serviceWorker' in navigator ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          <div className="support-item">
            <strong>Push API:</strong>
            <span>
              {'PushManager' in window ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          <div className="support-item">
            <strong>Notifications:</strong>
            <span>
              {'Notification' in window ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
        </div>
      </section>

      <style jsx>{`
        .notification-settings {
          max-width: 800px;
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

        .status-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .status-icon {
          font-size: 3rem;
        }

        .status-info {
          flex: 1;
        }

        .status-info h3 {
          font-size: 1.2rem;
          margin-bottom: 0.25rem;
        }

        .status-info p {
          color: #aaa;
          font-size: 0.9rem;
        }

        .status-actions {
          display: flex;
          gap: 0.75rem;
          flex-direction: column;
        }

        .btn-primary,
        .btn-secondary,
        .btn-danger {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
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

        .help-text {
          font-size: 0.85rem;
          color: #888;
          margin-top: 0.5rem;
        }

        .preferences {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .preference-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .preference-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .preference-info .icon {
          font-size: 2rem;
        }

        .preference-info h3 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .preference-info p {
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

        .support-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .support-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
        }

        .support-item strong {
          color: #fff;
        }

        .support-item span {
          color: #888;
        }

        @media (max-width: 768px) {
          .status-card {
            flex-direction: column;
            text-align: center;
          }

          .status-actions {
            width: 100%;
          }

          .status-actions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
