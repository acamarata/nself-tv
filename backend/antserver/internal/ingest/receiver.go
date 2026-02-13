// Package ingest provides stream receiver interfaces and connection management
// for SRT/RTMP ingest pipelines.
package ingest

import (
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

// ConnectionState represents the state of an ingest connection managed by the Receiver.
// These are distinct from TransportState values used by the lower-level Transport layer.
type ConnectionState string

const (
	ConnDisconnected ConnectionState = "disconnected"
	ConnConnecting   ConnectionState = "connecting"
	ConnConnected    ConnectionState = "connected"
	ConnReconnecting ConnectionState = "reconnecting"
	ConnFailed       ConnectionState = "failed"
)

// Protocol is the transport protocol for the ingest stream.
type Protocol string

const (
	ProtocolSRT  Protocol = "srt"
	ProtocolRTMP Protocol = "rtmp"
)

// ReconnectConfig controls the exponential backoff behavior for reconnection.
type ReconnectConfig struct {
	BaseDelay   time.Duration
	MaxAttempts int
}

// DefaultReconnectConfig returns the standard reconnection configuration.
// Backoff sequence: 5s, 10s, 20s, 40s, 80s (max 5 attempts).
func DefaultReconnectConfig() ReconnectConfig {
	return ReconnectConfig{
		BaseDelay:   5 * time.Second,
		MaxAttempts: 5,
	}
}

// ReconnectDelay calculates the delay for a given attempt using exponential backoff.
// attempt is 0-indexed: attempt 0 = BaseDelay, attempt 1 = BaseDelay*2, etc.
func (rc ReconnectConfig) ReconnectDelay(attempt int) time.Duration {
	if attempt < 0 {
		attempt = 0
	}
	if attempt >= rc.MaxAttempts {
		attempt = rc.MaxAttempts - 1
	}
	multiplier := math.Pow(2, float64(attempt))
	return time.Duration(float64(rc.BaseDelay) * multiplier)
}

// StreamTransport is an interface for the underlying stream transport.
// This allows testing without actual SRT/RTMP connections.
type StreamTransport interface {
	// Connect establishes a connection to the given URL.
	Connect(url string) error

	// Disconnect closes the current connection.
	Disconnect() error

	// IsConnected returns true if the transport is currently connected.
	IsConnected() bool

	// Read reads data from the stream into the buffer.
	// Returns the number of bytes read.
	Read(buf []byte) (int, error)
}

// Connection represents a single ingest connection with state tracking and reconnection.
type Connection struct {
	mu              sync.RWMutex
	ID              string
	URL             string
	Protocol        Protocol
	State           ConnectionState
	Transport       StreamTransport
	ReconnectConfig ReconnectConfig
	Attempts        int
	ConnectedAt     time.Time
	DisconnectedAt  time.Time
	LastError       string
	BytesReceived   int64
}

// Receiver manages multiple ingest connections.
type Receiver struct {
	mu          sync.RWMutex
	connections map[string]*Connection
}

// NewReceiver creates a new ingest Receiver.
func NewReceiver() *Receiver {
	return &Receiver{
		connections: make(map[string]*Connection),
	}
}

// CreateConnection creates a new connection entry with the given transport.
func (r *Receiver) CreateConnection(url string, protocol Protocol, transport StreamTransport) *Connection {
	conn := &Connection{
		ID:              uuid.New().String(),
		URL:             url,
		Protocol:        protocol,
		State:           ConnDisconnected,
		Transport:       transport,
		ReconnectConfig: DefaultReconnectConfig(),
		Attempts:        0,
	}

	r.mu.Lock()
	r.connections[conn.ID] = conn
	r.mu.Unlock()

	log.WithFields(log.Fields{
		"connection_id": conn.ID,
		"url":           url,
		"protocol":      protocol,
	}).Info("connection created")

	return conn
}

// Connect initiates the connection via the underlying transport.
func (r *Receiver) Connect(connectionID string) error {
	r.mu.Lock()
	conn, ok := r.connections[connectionID]
	r.mu.Unlock()
	if !ok {
		return fmt.Errorf("connection not found: %s", connectionID)
	}

	conn.mu.Lock()
	defer conn.mu.Unlock()

	if conn.State == ConnConnected {
		return fmt.Errorf("connection %s is already connected", connectionID)
	}

	conn.State = ConnConnecting

	if err := conn.Transport.Connect(conn.URL); err != nil {
		conn.State = ConnDisconnected
		conn.LastError = err.Error()
		return fmt.Errorf("transport connect failed: %w", err)
	}

	conn.State = ConnConnected
	conn.ConnectedAt = time.Now()
	conn.Attempts = 0

	log.WithFields(log.Fields{
		"connection_id": connectionID,
		"url":           conn.URL,
	}).Info("connection established")

	return nil
}

// Disconnect closes the connection.
func (r *Receiver) Disconnect(connectionID string) error {
	r.mu.Lock()
	conn, ok := r.connections[connectionID]
	r.mu.Unlock()
	if !ok {
		return fmt.Errorf("connection not found: %s", connectionID)
	}

	conn.mu.Lock()
	defer conn.mu.Unlock()

	if conn.State == ConnDisconnected || conn.State == ConnFailed {
		return nil
	}

	if err := conn.Transport.Disconnect(); err != nil {
		conn.LastError = err.Error()
		log.WithFields(log.Fields{
			"connection_id": connectionID,
			"error":         err,
		}).Warn("error during disconnect")
	}

	conn.State = ConnDisconnected
	conn.DisconnectedAt = time.Now()

	log.WithFields(log.Fields{
		"connection_id": connectionID,
	}).Info("connection disconnected")

	return nil
}

// AttemptReconnect tries to reconnect with exponential backoff.
// Returns the delay that should be waited before the actual reconnect,
// and whether another attempt is available.
func (r *Receiver) AttemptReconnect(connectionID string) (time.Duration, bool, error) {
	r.mu.Lock()
	conn, ok := r.connections[connectionID]
	r.mu.Unlock()
	if !ok {
		return 0, false, fmt.Errorf("connection not found: %s", connectionID)
	}

	conn.mu.Lock()
	defer conn.mu.Unlock()

	if conn.Attempts >= conn.ReconnectConfig.MaxAttempts {
		conn.State = ConnFailed
		log.WithFields(log.Fields{
			"connection_id": connectionID,
			"attempts":      conn.Attempts,
			"max_attempts":  conn.ReconnectConfig.MaxAttempts,
		}).Warn("reconnection attempts exhausted")
		return 0, false, nil
	}

	delay := conn.ReconnectConfig.ReconnectDelay(conn.Attempts)
	conn.Attempts++
	conn.State = ConnReconnecting

	log.WithFields(log.Fields{
		"connection_id": connectionID,
		"attempt":       conn.Attempts,
		"delay":         delay,
	}).Info("reconnection attempt scheduled")

	return delay, true, nil
}

// GetConnectionState returns the current state of a connection.
func (r *Receiver) GetConnectionState(connectionID string) (ConnectionState, error) {
	r.mu.RLock()
	conn, ok := r.connections[connectionID]
	r.mu.RUnlock()
	if !ok {
		return "", fmt.Errorf("connection not found: %s", connectionID)
	}

	conn.mu.RLock()
	defer conn.mu.RUnlock()

	return conn.State, nil
}

// GetConnection returns a snapshot of the connection (without the transport).
func (r *Receiver) GetConnection(connectionID string) (*Connection, error) {
	r.mu.RLock()
	conn, ok := r.connections[connectionID]
	r.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("connection not found: %s", connectionID)
	}

	conn.mu.RLock()
	defer conn.mu.RUnlock()

	return &Connection{
		ID:              conn.ID,
		URL:             conn.URL,
		Protocol:        conn.Protocol,
		State:           conn.State,
		ReconnectConfig: conn.ReconnectConfig,
		Attempts:        conn.Attempts,
		ConnectedAt:     conn.ConnectedAt,
		DisconnectedAt:  conn.DisconnectedAt,
		LastError:       conn.LastError,
		BytesReceived:   conn.BytesReceived,
	}, nil
}

// ListConnections returns snapshots of all connections.
func (r *Receiver) ListConnections() []*Connection {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*Connection, 0, len(r.connections))
	for _, conn := range r.connections {
		conn.mu.RLock()
		result = append(result, &Connection{
			ID:              conn.ID,
			URL:             conn.URL,
			Protocol:        conn.Protocol,
			State:           conn.State,
			ReconnectConfig: conn.ReconnectConfig,
			Attempts:        conn.Attempts,
			ConnectedAt:     conn.ConnectedAt,
			DisconnectedAt:  conn.DisconnectedAt,
			LastError:       conn.LastError,
			BytesReceived:   conn.BytesReceived,
		})
		conn.mu.RUnlock()
	}
	return result
}
