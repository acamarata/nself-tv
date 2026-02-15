import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handlePlayMedia = (mediaId: string, title: string) => {
    navigation.navigate('Player', { mediaId, title });
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>nself-tv</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Watching</Text>
          <Text style={styles.placeholder}>Content will appear here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended</Text>
          <Text style={styles.placeholder}>Content will appear here</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending</Text>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => handlePlayMedia('demo-1', 'Demo Video')}
          >
            <Text style={styles.demoButtonText}>Play Demo Video</Text>
          </TouchableOpacity>
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
  demoButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
