'use client';

import { useState, useEffect } from 'react';
import { useReducedMotion, useHighContrast } from '@/hooks/useAccessibility';

export default function AccessibilitySettingsPage() {
  const systemReducedMotion = useReducedMotion();
  const systemHighContrast = useHighContrast();

  const [settings, setSettings] = useState({
    // Visual
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    focusIndicators: true,

    // Subtitles/Captions
    subtitlesEnabled: false,
    subtitleSize: 'medium' as 'small' | 'medium' | 'large',
    subtitleBackground: true,
    audioDescriptions: false,

    // Navigation
    keyboardShortcuts: true,
    skipIntros: true,
    autoplay: true,

    // Screen Reader
    screenReaderAnnouncements: true,
    verboseDescriptions: false,
  });

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    } else {
      // Apply system preferences
      setSettings((prev) => ({
        ...prev,
        reducedMotion: systemReducedMotion,
        highContrast: systemHighContrast,
      }));
    }
  }, [systemReducedMotion, systemHighContrast]);

  const updateSetting = (key: keyof typeof settings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('accessibility-settings', JSON.stringify(updated));

    // Apply to document
    applySettings(updated);
  };

  const applySettings = (settings: typeof settings) => {
    const root = document.documentElement;

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Large text
    if (settings.largeText) {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.remove('no-focus');
    } else {
      root.classList.add('no-focus');
    }

    // Subtitle size
    root.style.setProperty('--subtitle-size', settings.subtitleSize);
  };

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  return (
    <div className="accessibility-settings">
      <h1>♿ Accessibility</h1>
      <p className="subtitle">Customize accessibility features to fit your needs</p>

      {/* System Preferences Detection */}
      {(systemReducedMotion || systemHighContrast) && (
        <div className="system-prefs-banner">
          <div className="icon">ℹ️</div>
          <div>
            <strong>System preferences detected:</strong>
            <ul>
              {systemReducedMotion && <li>Reduced motion</li>}
              {systemHighContrast && <li>High contrast</li>}
            </ul>
            <p>These settings have been applied automatically.</p>
          </div>
        </div>
      )}

      {/* Visual Settings */}
      <section className="section">
        <h2>Visual</h2>

        <div className="setting-item">
          <div className="setting-info">
            <h3>High Contrast</h3>
            <p>Increase color contrast for better visibility</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => updateSetting('highContrast', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Large Text</h3>
            <p>Increase default font size</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.largeText}
              onChange={(e) => updateSetting('largeText', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Reduced Motion</h3>
            <p>Minimize animations and transitions</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Focus Indicators</h3>
            <p>Show visible outline when navigating with keyboard</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.focusIndicators}
              onChange={(e) => updateSetting('focusIndicators', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      </section>

      {/* Subtitles & Captions */}
      <section className="section">
        <h2>Subtitles & Captions</h2>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Enable Subtitles by Default</h3>
            <p>Always show subtitles when available</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.subtitlesEnabled}
              onChange={(e) => updateSetting('subtitlesEnabled', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Subtitle Size</h3>
            <p>Adjust subtitle text size</p>
          </div>
          <div className="button-group">
            <button
              onClick={() => updateSetting('subtitleSize', 'small')}
              className={settings.subtitleSize === 'small' ? 'active' : ''}
            >
              Small
            </button>
            <button
              onClick={() => updateSetting('subtitleSize', 'medium')}
              className={settings.subtitleSize === 'medium' ? 'active' : ''}
            >
              Medium
            </button>
            <button
              onClick={() => updateSetting('subtitleSize', 'large')}
              className={settings.subtitleSize === 'large' ? 'active' : ''}
            >
              Large
            </button>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Subtitle Background</h3>
            <p>Add semi-transparent background behind subtitles</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.subtitleBackground}
              onChange={(e) => updateSetting('subtitleBackground', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Audio Descriptions</h3>
            <p>Narration describing visual elements (when available)</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.audioDescriptions}
              onChange={(e) => updateSetting('audioDescriptions', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      </section>

      {/* Navigation */}
      <section className="section">
        <h2>Navigation</h2>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Keyboard Shortcuts</h3>
            <p>Enable global keyboard shortcuts (press ? to view)</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.keyboardShortcuts}
              onChange={(e) => updateSetting('keyboardShortcuts', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Skip Intros</h3>
            <p>Automatically skip show intros</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.skipIntros}
              onChange={(e) => updateSetting('skipIntros', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Autoplay Next Episode</h3>
            <p>Automatically play next episode in series</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.autoplay}
              onChange={(e) => updateSetting('autoplay', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      </section>

      {/* Screen Reader */}
      <section className="section">
        <h2>Screen Reader</h2>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Screen Reader Announcements</h3>
            <p>Announce navigation changes and important updates</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.screenReaderAnnouncements}
              onChange={(e) =>
                updateSetting('screenReaderAnnouncements', e.target.checked)
              }
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Verbose Descriptions</h3>
            <p>Include additional details in ARIA labels</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.verboseDescriptions}
              onChange={(e) => updateSetting('verboseDescriptions', e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      </section>

      {/* Resources */}
      <section className="section">
        <h2>Resources</h2>
        <div className="resources-grid">
          <a
            href="https://www.w3.org/WAI/WCAG21/quickref/"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-card"
          >
            <div className="resource-icon">📖</div>
            <div>
              <h3>WCAG Guidelines</h3>
              <p>Web Content Accessibility Guidelines</p>
            </div>
          </a>

          <a
            href="mailto:accessibility@nself.org"
            className="resource-card"
          >
            <div className="resource-icon">✉️</div>
            <div>
              <h3>Report Issue</h3>
              <p>Contact accessibility team</p>
            </div>
          </a>
        </div>
      </section>

      <style jsx>{`
        .accessibility-settings {
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

        .system-prefs-banner {
          display: flex;
          gap: 1rem;
          background: rgba(74, 158, 255, 0.1);
          border: 1px solid rgba(74, 158, 255, 0.3);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
        }

        .system-prefs-banner .icon {
          font-size: 1.5rem;
        }

        .system-prefs-banner ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }

        .system-prefs-banner p {
          color: #888;
          font-size: 0.9rem;
          margin-top: 0.5rem;
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

        .setting-info {
          flex: 1;
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

        .button-group {
          display: flex;
          gap: 0.5rem;
        }

        .button-group button {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #fff;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-group button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .button-group button.active {
          background: #4a9eff;
          border-color: #4a9eff;
        }

        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .resource-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }

        .resource-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: #4a9eff;
        }

        .resource-icon {
          font-size: 2rem;
        }

        .resource-card h3 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
          color: #fff;
        }

        .resource-card p {
          font-size: 0.875rem;
          color: #888;
        }
      `}</style>
    </div>
  );
}
