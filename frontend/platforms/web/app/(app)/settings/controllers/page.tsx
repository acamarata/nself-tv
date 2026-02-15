'use client';

import { useState } from 'react';
import { useGamepad, STANDARD_MAPPING, vibrateGamepad } from '@/hooks/useGamepad';

export default function ControllersPage() {
  const [deadzone, setDeadzone] = useState(0.1);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [remapping, setRemapping] = useState(false);
  const [buttonToRemap, setButtonToRemap] = useState<number | null>(null);

  const { gamepads, supported } = useGamepad({
    deadzone,
    onButtonPress: (index, button) => {
      if (remapping && buttonToRemap !== null) {
        console.log(`Remap button ${buttonToRemap} to physical button ${button}`);
        setRemapping(false);
        setButtonToRemap(null);
      }
    },
  });

  const handleTestVibration = (index: number) => {
    vibrateGamepad(index, 300, 0.8, 0.4);
  };

  const handleRemapButton = (button: number) => {
    setRemapping(true);
    setButtonToRemap(button);
  };

  if (!supported) {
    return (
      <div className="controllers-page">
        <header className="page-header">
          <h1>Controller Settings</h1>
        </header>
        <div className="error-state">
          <p>Gamepad API is not supported in this browser.</p>
          <p>Try Chrome, Edge, or Firefox.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="controllers-page">
      <header className="page-header">
        <h1>Controller Settings</h1>
        <p className="subtitle">
          Configure gamepad settings and button mappings
        </p>
      </header>

      <div className="controllers-content">
        <section className="global-settings">
          <h2>Global Settings</h2>

          <div className="setting">
            <label>
              <span>Deadzone: {(deadzone * 100).toFixed(0)}%</span>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.01"
                value={deadzone}
                onChange={(e) => setDeadzone(parseFloat(e.target.value))}
              />
            </label>
            <p className="help-text">
              Prevents stick drift by ignoring small movements
            </p>
          </div>

          <div className="setting">
            <label>
              <span>Sensitivity: {sensitivity.toFixed(1)}x</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              />
            </label>
            <p className="help-text">
              Adjust how responsive the analog sticks feel
            </p>
          </div>
        </section>

        <section className="connected-controllers">
          <h2>Connected Controllers</h2>

          {gamepads.length === 0 && (
            <div className="empty-state">
              <p>No controllers connected</p>
              <p className="help-text">
                Press any button on your controller to connect
              </p>
            </div>
          )}

          {gamepads.map((gamepad) => (
            <div key={gamepad.index} className="controller-card">
              <div className="controller-header">
                <h3>{gamepad.id}</h3>
                <span className="controller-index">#{gamepad.index + 1}</span>
              </div>

              <div className="controller-info">
                <div className="info-row">
                  <span className="label">Mapping:</span>
                  <span className="value">{gamepad.mapping}</span>
                </div>
                <div className="info-row">
                  <span className="label">Connected:</span>
                  <span className={`status ${gamepad.connected ? 'connected' : 'disconnected'}`}>
                    {gamepad.connected ? '✓ Connected' : '✗ Disconnected'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleTestVibration(gamepad.index)}
                className="test-vibration-btn"
              >
                Test Vibration
              </button>

              <div className="button-status">
                <h4>Buttons</h4>
                <div className="button-grid">
                  {gamepad.buttons.map((pressed, index) => (
                    <div
                      key={index}
                      className={`button-indicator ${pressed ? 'pressed' : ''}`}
                      title={STANDARD_MAPPING.buttons[index] || `Button ${index}`}
                    >
                      <span className="button-number">{index}</span>
                      <span className="button-name">
                        {STANDARD_MAPPING.buttons[index]?.slice(0, 3) || `B${index}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="axis-status">
                <h4>Analog Sticks</h4>
                <div className="axis-grid">
                  {[0, 1, 2, 3].map((index) => {
                    const value = gamepad.axes[index] || 0;
                    const percentage = Math.round((value + 1) * 50);
                    return (
                      <div key={index} className="axis-indicator">
                        <label>{STANDARD_MAPPING.axes[index] || `Axis ${index}`}</label>
                        <div className="axis-bar">
                          <div className="axis-center" />
                          <div
                            className="axis-value"
                            style={{ left: `${percentage}%` }}
                          />
                        </div>
                        <span className="axis-number">{value.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="button-remapping">
                <h4>Button Remapping</h4>
                {remapping && (
                  <div className="remap-prompt">
                    <p>Press a button to remap...</p>
                    <button onClick={() => setRemapping(false)}>Cancel</button>
                  </div>
                )}
                <div className="remap-grid">
                  {Object.entries(STANDARD_MAPPING.buttons).slice(0, 10).map(([index, name]) => (
                    <button
                      key={index}
                      className="remap-btn"
                      onClick={() => handleRemapButton(parseInt(index))}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="help-section">
          <h2>Bluetooth Pairing</h2>
          <div className="pairing-instructions">
            <h3>Xbox Controller</h3>
            <ol>
              <li>Press and hold the pairing button (top of controller)</li>
              <li>Open Bluetooth settings on your device</li>
              <li>Select "Xbox Wireless Controller"</li>
            </ol>

            <h3>PlayStation Controller</h3>
            <ol>
              <li>Hold Share + PS button for 3 seconds</li>
              <li>Light bar will flash white</li>
              <li>Open Bluetooth settings and select controller</li>
            </ol>

            <h3>Switch Pro Controller</h3>
            <ol>
              <li>Press and hold sync button (top left of controller)</li>
              <li>LEDs will flash</li>
              <li>Open Bluetooth settings and select "Pro Controller"</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
