/**
 * nself-tv Android TV App
 *
 * Foundation created - requires full implementation
 */

import React from 'react';
import { Text, View, StyleSheet, TVFocusGuideView } from 'react-native';

// TODO: Implement full Android TV app
// - Navigation stack with TV focus management
// - Home screen with content rows
// - Player with D-pad controls
// - Settings with TV-optimized UI
// - GraphQL integration
// - State management

export default function App() {
  return (
    <TVFocusGuideView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ɳSelf TV - Android TV</Text>
        <Text style={styles.subtitle}>Foundation Created - Implementation Pending</Text>
        <Text style={styles.message}>
          This is a buildable scaffold. Full implementation required.
        </Text>
      </View>
    </TVFocusGuideView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 32,
    color: '#999',
    marginBottom: 40,
  },
  message: {
    fontSize: 24,
    color: '#666',
    textAlign: 'center',
  },
});
