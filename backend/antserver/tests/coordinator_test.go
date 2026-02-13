package tests

import (
	"testing"

	"antserver/internal/coordinator"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegisterDevice(t *testing.T) {
	c := coordinator.New()
	dev, err := c.RegisterDevice("antbox-001", "Living Room", 4)
	require.NoError(t, err)

	assert.Equal(t, "antbox-001", dev.ID)
	assert.Equal(t, "Living Room", dev.Name)
	assert.Equal(t, 4, dev.TunerCount)
	assert.Len(t, dev.Tuners, 4)
	assert.True(t, dev.Online)

	for i, tuner := range dev.Tuners {
		assert.Equal(t, "antbox-001", tuner.DeviceID)
		assert.Equal(t, i, tuner.TunerIndex)
		assert.Equal(t, coordinator.TunerAvailable, tuner.State)
	}
}

func TestRegisterDeviceInvalidTunerCount(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 0)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "tuner count must be positive")

	_, err = c.RegisterDevice("antbox-002", "Test", -1)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "tuner count must be positive")
}

func TestRegisterDeviceDuplicate(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "First", 2)
	require.NoError(t, err)

	_, err = c.RegisterDevice("antbox-001", "Second", 4)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "device already registered")
}

func TestAssignTuner(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 2)
	require.NoError(t, err)

	deviceID, tunerIndex, err := c.AssignTuner("event-001")
	require.NoError(t, err)
	assert.Equal(t, "antbox-001", deviceID)
	assert.Equal(t, 0, tunerIndex)

	deviceID2, tunerIndex2, err := c.AssignTuner("event-002")
	require.NoError(t, err)
	assert.Equal(t, "antbox-001", deviceID2)
	assert.Equal(t, 1, tunerIndex2)
}

func TestAssignTunerNoAvailable(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 1)
	require.NoError(t, err)

	// Assign the only tuner.
	_, _, err = c.AssignTuner("event-001")
	require.NoError(t, err)

	// No more tuners available.
	_, _, err = c.AssignTuner("event-002")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no available tuners")
}

func TestAssignTunerSkipsOfflineDevices(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Offline Box", 2)
	require.NoError(t, err)
	_, err = c.RegisterDevice("antbox-002", "Online Box", 2)
	require.NoError(t, err)

	// Take first device offline.
	err = c.SetDeviceOnline("antbox-001", false)
	require.NoError(t, err)

	// Should assign from the online device.
	deviceID, _, err := c.AssignTuner("event-001")
	require.NoError(t, err)
	assert.Equal(t, "antbox-002", deviceID)
}

func TestReleaseTuner(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 2)
	require.NoError(t, err)

	deviceID, tunerIndex, err := c.AssignTuner("event-001")
	require.NoError(t, err)

	// Release the tuner.
	err = c.ReleaseTuner(deviceID, tunerIndex)
	require.NoError(t, err)

	// Should be available again.
	available := c.GetAvailableTuners()
	assert.Len(t, available, 2)
}

func TestReleaseTunerNotAssigned(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 2)
	require.NoError(t, err)

	// Try to release a tuner that was never assigned.
	err = c.ReleaseTuner("antbox-001", 0)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not assigned")
}

func TestReleaseTunerDeviceNotFound(t *testing.T) {
	c := coordinator.New()
	err := c.ReleaseTuner("nonexistent", 0)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "device not found")
}

func TestReleaseTunerInvalidIndex(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 2)
	require.NoError(t, err)

	err = c.ReleaseTuner("antbox-001", 5)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid tuner index")

	err = c.ReleaseTuner("antbox-001", -1)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid tuner index")
}

func TestGetAvailableTuners(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Box 1", 2)
	require.NoError(t, err)
	_, err = c.RegisterDevice("antbox-002", "Box 2", 3)
	require.NoError(t, err)

	available := c.GetAvailableTuners()
	assert.Len(t, available, 5) // 2 + 3

	// Assign one tuner.
	_, _, err = c.AssignTuner("event-001")
	require.NoError(t, err)

	available = c.GetAvailableTuners()
	assert.Len(t, available, 4)
}

func TestGetAvailableTunersExcludesOffline(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Box 1", 2)
	require.NoError(t, err)
	_, err = c.RegisterDevice("antbox-002", "Box 2", 3)
	require.NoError(t, err)

	err = c.SetDeviceOnline("antbox-001", false)
	require.NoError(t, err)

	available := c.GetAvailableTuners()
	assert.Len(t, available, 3) // Only Box 2's tuners.
}

func TestGetDevice(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 2)
	require.NoError(t, err)

	dev, err := c.GetDevice("antbox-001")
	require.NoError(t, err)
	assert.Equal(t, "antbox-001", dev.ID)
	assert.Equal(t, "Test", dev.Name)
	assert.Len(t, dev.Tuners, 2)
}

func TestGetDeviceNotFound(t *testing.T) {
	c := coordinator.New()
	_, err := c.GetDevice("nonexistent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "device not found")
}

func TestSetDeviceOnline(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 2)
	require.NoError(t, err)

	err = c.SetDeviceOnline("antbox-001", false)
	require.NoError(t, err)

	dev, err := c.GetDevice("antbox-001")
	require.NoError(t, err)
	assert.False(t, dev.Online)

	err = c.SetDeviceOnline("antbox-001", true)
	require.NoError(t, err)

	dev, err = c.GetDevice("antbox-001")
	require.NoError(t, err)
	assert.True(t, dev.Online)
}

func TestSetDeviceOnlineNotFound(t *testing.T) {
	c := coordinator.New()
	err := c.SetDeviceOnline("nonexistent", true)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "device not found")
}

func TestListDevices(t *testing.T) {
	c := coordinator.New()

	devices := c.ListDevices()
	assert.Empty(t, devices)

	_, err := c.RegisterDevice("antbox-001", "Box 1", 2)
	require.NoError(t, err)
	_, err = c.RegisterDevice("antbox-002", "Box 2", 4)
	require.NoError(t, err)

	devices = c.ListDevices()
	assert.Len(t, devices, 2)
}

func TestAssignAndReleaseFullCycle(t *testing.T) {
	c := coordinator.New()
	_, err := c.RegisterDevice("antbox-001", "Test", 2)
	require.NoError(t, err)

	// Assign both tuners.
	d1, t1, err := c.AssignTuner("event-001")
	require.NoError(t, err)
	d2, t2, err := c.AssignTuner("event-002")
	require.NoError(t, err)

	// No more available.
	_, _, err = c.AssignTuner("event-003")
	assert.Error(t, err)

	// Release first tuner.
	err = c.ReleaseTuner(d1, t1)
	require.NoError(t, err)

	// Now one available.
	available := c.GetAvailableTuners()
	assert.Len(t, available, 1)

	// Can assign again.
	_, _, err = c.AssignTuner("event-003")
	require.NoError(t, err)

	// Release second tuner.
	err = c.ReleaseTuner(d2, t2)
	require.NoError(t, err)

	// No available (both assigned: 0 to event-003, 1 was released but 0 was reassigned).
	available = c.GetAvailableTuners()
	assert.Len(t, available, 1) // Tuner 1 was released, tuner 0 re-assigned.
}
