// Package ingest provides a live stream transport layer with SRT as the primary
// protocol and RTMP as automatic fallback. A finite state machine governs
// connection lifecycle with exponential-backoff reconnection.
//
// States:
//   - disconnected: initial state, no active connection
//   - connected:    healthy connection on primary or fallback protocol
//   - degraded:     reconnecting for >90s, stream may have gaps
//   - reconnecting: actively attempting to re-establish connection
//   - failed:       all reconnection attempts exhausted
package ingest

import (
	"errors"
	"sync"
	"time"
)

// TransportState represents the current connection state.
type TransportState string

const (
	StateDisconnected TransportState = "disconnected"
	StateConnected    TransportState = "connected"
	StateDegraded     TransportState = "degraded"
	StateReconnecting TransportState = "reconnecting"
	StateFailed       TransportState = "failed"
)

// Reconnection parameters.
const (
	InitialBackoff    = 5 * time.Second
	MaxReconnAttempts = 5
	BackoffMultiplier = 2
	DegradedThreshold = 90 * time.Second
	KeepaliveInterval = 5 * time.Second
)

// Sentinel errors.
var (
	ErrAlreadyConnected = errors.New("ingest: already connected")
	ErrNotConnected     = errors.New("ingest: not connected")
	ErrStreamIDEmpty    = errors.New("ingest: stream ID must not be empty")
	ErrNilConnector     = errors.New("ingest: connector must not be nil")
	ErrAllAttemptsFailed = errors.New("ingest: all reconnection attempts failed")
)

// StreamConnector abstracts the actual SRT/RTMP network operations so the
// transport layer can be tested without real network connections.
type StreamConnector interface {
	// ConnectSRT establishes an SRT connection to the given stream.
	ConnectSRT(streamID string) error

	// ConnectRTMP establishes an RTMP fallback connection to the given stream.
	ConnectRTMP(streamID string) error

	// Close terminates the current connection.
	Close() error

	// SendKeepalive sends a keepalive ping on the current connection.
	SendKeepalive() error
}

// StateChangeFunc is the signature for state change callbacks.
type StateChangeFunc func(old, new TransportState)

// Transport manages a live ingest connection with automatic reconnection and
// protocol fallback. It is safe for concurrent use.
type Transport struct {
	mu              sync.RWMutex
	connector       StreamConnector
	state           TransportState
	streamID        string
	protocol        string // "srt" or "rtmp"
	callbacks       []StateChangeFunc
	reconnAttempts  int
	reconnStartTime time.Time

	// stopKeepalive signals the keepalive goroutine to exit.
	stopKeepalive chan struct{}
	// stopReconn signals the reconnection goroutine to exit.
	stopReconn chan struct{}

	// Overridable for testing.
	now     func() time.Time
	sleep   func(time.Duration)
	backoff time.Duration
}

// NewTransport creates a Transport backed by the given StreamConnector.
func NewTransport(connector StreamConnector) (*Transport, error) {
	if connector == nil {
		return nil, ErrNilConnector
	}
	return &Transport{
		connector: connector,
		state:     StateDisconnected,
		now:       time.Now,
		sleep:     time.Sleep,
		backoff:   InitialBackoff,
	}, nil
}

// Connect initiates a connection for the given streamID. SRT is attempted first;
// on failure RTMP is used as fallback. Returns an error only if both fail.
func (t *Transport) Connect(streamID string) error {
	if streamID == "" {
		return ErrStreamIDEmpty
	}

	t.mu.Lock()
	if t.state == StateConnected || t.state == StateDegraded {
		t.mu.Unlock()
		return ErrAlreadyConnected
	}
	t.streamID = streamID
	t.mu.Unlock()

	// Try SRT first.
	if err := t.connector.ConnectSRT(streamID); err == nil {
		t.mu.Lock()
		t.protocol = "srt"
		t.reconnAttempts = 0
		t.backoff = InitialBackoff
		t.setState(StateConnected)
		t.mu.Unlock()
		t.startKeepalive()
		return nil
	}

	// Fallback to RTMP.
	if err := t.connector.ConnectRTMP(streamID); err == nil {
		t.mu.Lock()
		t.protocol = "rtmp"
		t.reconnAttempts = 0
		t.backoff = InitialBackoff
		t.setState(StateConnected)
		t.mu.Unlock()
		t.startKeepalive()
		return nil
	}

	t.mu.Lock()
	t.setState(StateFailed)
	t.mu.Unlock()
	return ErrAllAttemptsFailed
}

// Disconnect cleanly closes the current connection.
func (t *Transport) Disconnect() error {
	t.mu.Lock()
	if t.state == StateDisconnected {
		t.mu.Unlock()
		return ErrNotConnected
	}

	t.stopKeepaliveLoop()
	t.stopReconnLoop()
	t.setState(StateDisconnected)
	t.protocol = ""
	t.streamID = ""
	t.reconnAttempts = 0
	t.backoff = InitialBackoff
	t.mu.Unlock()

	return t.connector.Close()
}

// GetState returns the current transport state.
func (t *Transport) GetState() TransportState {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.state
}

// GetProtocol returns the currently active protocol ("srt" or "rtmp").
func (t *Transport) GetProtocol() string {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.protocol
}

// GetReconnAttempts returns the number of reconnection attempts made so far.
func (t *Transport) GetReconnAttempts() int {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.reconnAttempts
}

// OnStateChange registers a callback that fires whenever the transport state changes.
func (t *Transport) OnStateChange(cb StateChangeFunc) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.callbacks = append(t.callbacks, cb)
}

// TriggerReconnect initiates the reconnection state machine. This is typically
// called when the stream detects data loss or connection errors.
func (t *Transport) TriggerReconnect() {
	t.mu.Lock()

	if t.state == StateFailed || t.state == StateDisconnected {
		t.mu.Unlock()
		return
	}

	t.reconnStartTime = t.now()
	t.setState(StateReconnecting)
	t.stopKeepaliveLoop()
	t.mu.Unlock()

	go t.reconnectLoop()
}

// reconnectLoop attempts to reconnect with exponential backoff.
func (t *Transport) reconnectLoop() {
	t.mu.Lock()
	t.stopReconn = make(chan struct{})
	stopCh := t.stopReconn
	t.mu.Unlock()

	for {
		t.mu.Lock()

		// Check if we've been reconnecting long enough to be degraded.
		// Do this BEFORE checking max attempts so degraded state is reached
		// even if we're about to fail.
		elapsed := t.now().Sub(t.reconnStartTime)
		if elapsed >= DegradedThreshold && t.state != StateDegraded {
			t.setState(StateDegraded)
		}

		attempt := t.reconnAttempts
		if attempt >= MaxReconnAttempts {
			t.setState(StateFailed)
			t.mu.Unlock()
			return
		}

		backoff := t.backoff
		streamID := t.streamID
		t.reconnAttempts++
		t.backoff *= BackoffMultiplier
		t.mu.Unlock()

		// Wait for backoff period or cancellation.
		select {
		case <-stopCh:
			return
		default:
			t.sleep(backoff)
		}

		// Check for cancellation after sleep.
		select {
		case <-stopCh:
			return
		default:
		}

		// Try SRT first, then RTMP.
		if err := t.connector.ConnectSRT(streamID); err == nil {
			t.mu.Lock()
			t.protocol = "srt"
			t.reconnAttempts = 0
			t.backoff = InitialBackoff
			t.setState(StateConnected)
			t.mu.Unlock()
			t.startKeepalive()
			return
		}

		if err := t.connector.ConnectRTMP(streamID); err == nil {
			t.mu.Lock()
			t.protocol = "rtmp"
			t.reconnAttempts = 0
			t.backoff = InitialBackoff
			t.setState(StateConnected)
			t.mu.Unlock()
			t.startKeepalive()
			return
		}
	}
}

// startKeepalive launches a background goroutine that pings the connection
// at the configured interval.
func (t *Transport) startKeepalive() {
	t.mu.Lock()
	t.stopKeepalive = make(chan struct{})
	stopCh := t.stopKeepalive
	t.mu.Unlock()

	go func() {
		for {
			select {
			case <-stopCh:
				return
			default:
				t.sleep(KeepaliveInterval)
				select {
				case <-stopCh:
					return
				default:
					if err := t.connector.SendKeepalive(); err != nil {
						t.TriggerReconnect()
						return
					}
				}
			}
		}
	}()
}

// setState transitions to the new state and fires callbacks.
// Must be called with t.mu held for writing.
func (t *Transport) setState(newState TransportState) {
	if t.state == newState {
		return
	}
	old := t.state
	t.state = newState

	// Fire callbacks without holding the lock to avoid deadlocks.
	cbs := make([]StateChangeFunc, len(t.callbacks))
	copy(cbs, t.callbacks)

	go func() {
		for _, cb := range cbs {
			cb(old, newState)
		}
	}()
}

// stopKeepaliveLoop signals the keepalive goroutine to exit.
// Must be called with t.mu held.
func (t *Transport) stopKeepaliveLoop() {
	if t.stopKeepalive != nil {
		select {
		case <-t.stopKeepalive:
			// Already closed.
		default:
			close(t.stopKeepalive)
		}
		t.stopKeepalive = nil
	}
}

// stopReconnLoop signals the reconnection goroutine to exit.
// Must be called with t.mu held.
func (t *Transport) stopReconnLoop() {
	if t.stopReconn != nil {
		select {
		case <-t.stopReconn:
			// Already closed.
		default:
			close(t.stopReconn)
		}
		t.stopReconn = nil
	}
}

// SetTestSleep replaces the sleep function for testing.
func (t *Transport) SetTestSleep(fn func(time.Duration)) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.sleep = fn
}

// SetTestNow replaces the time function for testing.
func (t *Transport) SetTestNow(fn func() time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.now = fn
}
