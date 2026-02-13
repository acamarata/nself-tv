// Package coordinator manages AntBox tuner assignment, release, and availability tracking.
package coordinator

import (
	"fmt"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"
)

// TunerState represents the current state of a tuner.
type TunerState string

const (
	TunerAvailable TunerState = "available"
	TunerAssigned  TunerState = "assigned"
	TunerFailed    TunerState = "failed"
)

// TunerInfo describes a single tuner on a device.
type TunerInfo struct {
	DeviceID   string     `json:"device_id"`
	TunerIndex int        `json:"tuner_index"`
	State      TunerState `json:"state"`
	EventID    string     `json:"event_id,omitempty"`
	AssignedAt time.Time  `json:"assigned_at,omitempty"`
}

// Device represents an AntBox device with one or more tuners.
type Device struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	TunerCount  int          `json:"tuner_count"`
	Tuners      []*TunerInfo `json:"tuners"`
	Online      bool         `json:"online"`
	LastSeenAt  time.Time    `json:"last_seen_at"`
	RegisterdAt time.Time    `json:"registered_at"`
}

// Coordinator manages AntBox devices and their tuner assignments.
type Coordinator struct {
	mu      sync.RWMutex
	devices map[string]*Device
}

// New creates a new Coordinator.
func New() *Coordinator {
	return &Coordinator{
		devices: make(map[string]*Device),
	}
}

// RegisterDevice registers an AntBox device with the given number of tuners.
func (c *Coordinator) RegisterDevice(deviceID, name string, tunerCount int) (*Device, error) {
	if tunerCount <= 0 {
		return nil, fmt.Errorf("tuner count must be positive, got %d", tunerCount)
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if _, exists := c.devices[deviceID]; exists {
		return nil, fmt.Errorf("device already registered: %s", deviceID)
	}

	now := time.Now()
	tuners := make([]*TunerInfo, tunerCount)
	for i := 0; i < tunerCount; i++ {
		tuners[i] = &TunerInfo{
			DeviceID:   deviceID,
			TunerIndex: i,
			State:      TunerAvailable,
		}
	}

	dev := &Device{
		ID:          deviceID,
		Name:        name,
		TunerCount:  tunerCount,
		Tuners:      tuners,
		Online:      true,
		LastSeenAt:  now,
		RegisterdAt: now,
	}

	c.devices[deviceID] = dev

	log.WithFields(log.Fields{
		"device_id":   deviceID,
		"name":        name,
		"tuner_count": tunerCount,
	}).Info("device registered")

	return dev, nil
}

// AssignTuner finds the first available tuner across all online devices and assigns
// it to the given event. Returns the device ID and tuner index.
func (c *Coordinator) AssignTuner(eventID string) (string, int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, dev := range c.devices {
		if !dev.Online {
			continue
		}
		for _, tuner := range dev.Tuners {
			if tuner.State == TunerAvailable {
				tuner.State = TunerAssigned
				tuner.EventID = eventID
				tuner.AssignedAt = time.Now()

				log.WithFields(log.Fields{
					"device_id":   dev.ID,
					"tuner_index": tuner.TunerIndex,
					"event_id":    eventID,
				}).Info("tuner assigned")

				return dev.ID, tuner.TunerIndex, nil
			}
		}
	}

	return "", 0, fmt.Errorf("no available tuners for event %s", eventID)
}

// ReleaseTuner releases a previously assigned tuner back to the available pool.
func (c *Coordinator) ReleaseTuner(deviceID string, tunerIndex int) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	dev, ok := c.devices[deviceID]
	if !ok {
		return fmt.Errorf("device not found: %s", deviceID)
	}

	if tunerIndex < 0 || tunerIndex >= len(dev.Tuners) {
		return fmt.Errorf("invalid tuner index %d for device %s (has %d tuners)", tunerIndex, deviceID, len(dev.Tuners))
	}

	tuner := dev.Tuners[tunerIndex]
	if tuner.State != TunerAssigned {
		return fmt.Errorf("tuner %d on device %s is not assigned (state: %s)", tunerIndex, deviceID, tuner.State)
	}

	oldEvent := tuner.EventID
	tuner.State = TunerAvailable
	tuner.EventID = ""
	tuner.AssignedAt = time.Time{}

	log.WithFields(log.Fields{
		"device_id":   deviceID,
		"tuner_index": tunerIndex,
		"event_id":    oldEvent,
	}).Info("tuner released")

	return nil
}

// GetAvailableTuners returns a list of all available tuners across all online devices.
func (c *Coordinator) GetAvailableTuners() []TunerInfo {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var result []TunerInfo
	for _, dev := range c.devices {
		if !dev.Online {
			continue
		}
		for _, tuner := range dev.Tuners {
			if tuner.State == TunerAvailable {
				result = append(result, *tuner)
			}
		}
	}
	return result
}

// GetDevice returns a copy of the device with the given ID.
func (c *Coordinator) GetDevice(deviceID string) (*Device, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	dev, ok := c.devices[deviceID]
	if !ok {
		return nil, fmt.Errorf("device not found: %s", deviceID)
	}

	copy := *dev
	copy.Tuners = make([]*TunerInfo, len(dev.Tuners))
	for i, t := range dev.Tuners {
		tc := *t
		copy.Tuners[i] = &tc
	}
	return &copy, nil
}

// SetDeviceOnline sets the online status of a device.
func (c *Coordinator) SetDeviceOnline(deviceID string, online bool) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	dev, ok := c.devices[deviceID]
	if !ok {
		return fmt.Errorf("device not found: %s", deviceID)
	}

	dev.Online = online
	dev.LastSeenAt = time.Now()

	log.WithFields(log.Fields{
		"device_id": deviceID,
		"online":    online,
	}).Info("device online status updated")

	return nil
}

// ListDevices returns a list of all registered devices.
func (c *Coordinator) ListDevices() []*Device {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := make([]*Device, 0, len(c.devices))
	for _, dev := range c.devices {
		copy := *dev
		result = append(result, &copy)
	}
	return result
}
