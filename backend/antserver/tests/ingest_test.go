package tests

import (
	"fmt"
	"testing"
	"time"

	"antserver/internal/ingest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockTransport is a test double for the StreamTransport interface.
type mockTransport struct {
	connected     bool
	connectErr    error
	disconnectErr error
	readData      []byte
	readErr       error
}

func (m *mockTransport) Connect(url string) error {
	if m.connectErr != nil {
		return m.connectErr
	}
	m.connected = true
	return nil
}

func (m *mockTransport) Disconnect() error {
	if m.disconnectErr != nil {
		return m.disconnectErr
	}
	m.connected = false
	return nil
}

func (m *mockTransport) IsConnected() bool {
	return m.connected
}

func (m *mockTransport) Read(buf []byte) (int, error) {
	if m.readErr != nil {
		return 0, m.readErr
	}
	n := copy(buf, m.readData)
	return n, nil
}

// --- Connection State Tests ---

func TestCreateConnection(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	assert.NotEmpty(t, conn.ID)
	assert.Equal(t, "srt://192.168.1.100:9000", conn.URL)
	assert.Equal(t, ingest.ProtocolSRT, conn.Protocol)
	assert.Equal(t, ingest.ConnDisconnected, conn.State)
	assert.Equal(t, 0, conn.Attempts)
}

func TestConnect(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	err := r.Connect(conn.ID)
	require.NoError(t, err)

	state, err := r.GetConnectionState(conn.ID)
	require.NoError(t, err)
	assert.Equal(t, ingest.ConnConnected, state)
	assert.True(t, transport.connected)
}

func TestConnectAlreadyConnected(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	err := r.Connect(conn.ID)
	require.NoError(t, err)

	err = r.Connect(conn.ID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already connected")
}

func TestConnectTransportError(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{connectErr: fmt.Errorf("connection refused")}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	err := r.Connect(conn.ID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "connection refused")

	state, _ := r.GetConnectionState(conn.ID)
	assert.Equal(t, ingest.ConnDisconnected, state)
}

func TestConnectNotFound(t *testing.T) {
	r := ingest.NewReceiver()
	err := r.Connect("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "connection not found")
}

func TestDisconnect(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	err := r.Connect(conn.ID)
	require.NoError(t, err)

	err = r.Disconnect(conn.ID)
	require.NoError(t, err)

	state, _ := r.GetConnectionState(conn.ID)
	assert.Equal(t, ingest.ConnDisconnected, state)
	assert.False(t, transport.connected)
}

func TestDisconnectAlreadyDisconnected(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	// Disconnect without connecting (already disconnected).
	err := r.Disconnect(conn.ID)
	require.NoError(t, err) // Should be a no-op.
}

func TestDisconnectNotFound(t *testing.T) {
	r := ingest.NewReceiver()
	err := r.Disconnect("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "connection not found")
}

// --- Reconnection Tests ---

func TestReconnectExponentialBackoff(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	expectedDelays := []time.Duration{
		5 * time.Second,  // attempt 0: 5s * 2^0
		10 * time.Second, // attempt 1: 5s * 2^1
		20 * time.Second, // attempt 2: 5s * 2^2
		40 * time.Second, // attempt 3: 5s * 2^3
		80 * time.Second, // attempt 4: 5s * 2^4
	}

	for i, expected := range expectedDelays {
		delay, hasMore, err := r.AttemptReconnect(conn.ID)
		require.NoError(t, err, "attempt %d", i)
		assert.True(t, hasMore, "attempt %d should have more", i)
		assert.Equal(t, expected, delay, "attempt %d delay mismatch", i)
	}

	// Sixth attempt should be exhausted.
	_, hasMore, err := r.AttemptReconnect(conn.ID)
	require.NoError(t, err)
	assert.False(t, hasMore)

	// State should be failed.
	state, _ := r.GetConnectionState(conn.ID)
	assert.Equal(t, ingest.ConnFailed, state)
}

func TestReconnectNotFound(t *testing.T) {
	r := ingest.NewReceiver()
	_, _, err := r.AttemptReconnect("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "connection not found")
}

func TestReconnectConfigDefaults(t *testing.T) {
	cfg := ingest.DefaultReconnectConfig()
	assert.Equal(t, 5*time.Second, cfg.BaseDelay)
	assert.Equal(t, 5, cfg.MaxAttempts)
}

func TestReconnectDelayCalculation(t *testing.T) {
	cfg := ingest.DefaultReconnectConfig()

	tests := []struct {
		attempt  int
		expected time.Duration
	}{
		{0, 5 * time.Second},
		{1, 10 * time.Second},
		{2, 20 * time.Second},
		{3, 40 * time.Second},
		{4, 80 * time.Second},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("attempt_%d", tt.attempt), func(t *testing.T) {
			delay := cfg.ReconnectDelay(tt.attempt)
			assert.Equal(t, tt.expected, delay)
		})
	}
}

func TestReconnectDelayNegativeAttempt(t *testing.T) {
	cfg := ingest.DefaultReconnectConfig()
	delay := cfg.ReconnectDelay(-1)
	assert.Equal(t, 5*time.Second, delay) // Should clamp to 0.
}

func TestReconnectDelayBeyondMax(t *testing.T) {
	cfg := ingest.DefaultReconnectConfig()
	delay := cfg.ReconnectDelay(100)
	assert.Equal(t, 80*time.Second, delay) // Should clamp to MaxAttempts-1.
}

// --- GetConnection and ListConnections Tests ---

func TestGetConnection(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	fetched, err := r.GetConnection(conn.ID)
	require.NoError(t, err)
	assert.Equal(t, conn.ID, fetched.ID)
	assert.Equal(t, conn.URL, fetched.URL)
	assert.Equal(t, conn.Protocol, fetched.Protocol)
	assert.Nil(t, fetched.Transport) // Transport should not be copied.
}

func TestGetConnectionNotFound(t *testing.T) {
	r := ingest.NewReceiver()
	_, err := r.GetConnection("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "connection not found")
}

func TestListConnections(t *testing.T) {
	r := ingest.NewReceiver()

	conns := r.ListConnections()
	assert.Empty(t, conns)

	r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, &mockTransport{})
	r.CreateConnection("rtmp://192.168.1.101:1935", ingest.ProtocolRTMP, &mockTransport{})

	conns = r.ListConnections()
	assert.Len(t, conns, 2)
}

func TestGetConnectionState(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	state, err := r.GetConnectionState(conn.ID)
	require.NoError(t, err)
	assert.Equal(t, ingest.ConnDisconnected, state)
}

func TestGetConnectionStateNotFound(t *testing.T) {
	r := ingest.NewReceiver()
	_, err := r.GetConnectionState("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "connection not found")
}

// --- Protocol Tests ---

func TestProtocolSRT(t *testing.T) {
	r := ingest.NewReceiver()
	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, &mockTransport{})
	assert.Equal(t, ingest.ProtocolSRT, conn.Protocol)
}

func TestProtocolRTMP(t *testing.T) {
	r := ingest.NewReceiver()
	conn := r.CreateConnection("rtmp://192.168.1.100:1935/live", ingest.ProtocolRTMP, &mockTransport{})
	assert.Equal(t, ingest.ProtocolRTMP, conn.Protocol)
}

// --- State Tracking Through Operations ---

func TestConnectionStateTracking(t *testing.T) {
	r := ingest.NewReceiver()
	transport := &mockTransport{}

	conn := r.CreateConnection("srt://192.168.1.100:9000", ingest.ProtocolSRT, transport)

	// Initially disconnected.
	state, _ := r.GetConnectionState(conn.ID)
	assert.Equal(t, ingest.ConnDisconnected, state)

	// After connecting.
	err := r.Connect(conn.ID)
	require.NoError(t, err)
	state, _ = r.GetConnectionState(conn.ID)
	assert.Equal(t, ingest.ConnConnected, state)

	// After disconnecting.
	err = r.Disconnect(conn.ID)
	require.NoError(t, err)
	state, _ = r.GetConnectionState(conn.ID)
	assert.Equal(t, ingest.ConnDisconnected, state)

	// After attempting reconnect (should be reconnecting).
	_, _, err = r.AttemptReconnect(conn.ID)
	require.NoError(t, err)
	state, _ = r.GetConnectionState(conn.ID)
	assert.Equal(t, ingest.ConnReconnecting, state)
}
