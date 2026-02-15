import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export function LibraryScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Downloads</Text>
          <Text style={styles.placeholder}>Downloaded content will appear here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorites</Text>
          <Text style={styles.placeholder}>Favorite content will appear here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watch Later</Text>
          <Text style={styles.placeholder}>Saved content will appear here</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  placeholder: {
    color: '#8E8E93',
    fontSize: 14,
  },
});
