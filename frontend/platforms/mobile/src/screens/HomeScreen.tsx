import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useContinueWatching, useRecommended, useTrending } from '../hooks/useHomeContent';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: continueData, loading: continueLoading } = useContinueWatching();
  const { data: recommendedData, loading: recommendedLoading } = useRecommended();
  const { data: trendingData, loading: trendingLoading } = useTrending();

  const handlePlayMedia = (mediaId: string, title: string) => {
    navigation.navigate('Player', { mediaId, title });
  };

  const renderMediaItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.mediaCard}
      onPress={() => handlePlayMedia(item.media_item.id, item.media_item.title)}
    >
      {item.media_item.poster_url ? (
        <Image source={{ uri: item.media_item.poster_url }} style={styles.poster} />
      ) : (
        <View style={styles.posterPlaceholder}>
          <Text style={styles.posterPlaceholderText}>📺</Text>
        </View>
      )}
      <Text style={styles.mediaTitle} numberOfLines={2}>{item.media_item.title}</Text>
      {item.percentage !== undefined && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${item.percentage}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>ɳSelf TV</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Watching</Text>
          {continueLoading ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : continueData?.watch_progress?.length > 0 ? (
            <FlatList
              horizontal
              data={continueData.watch_progress}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyText}>No content in progress</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended</Text>
          {recommendedLoading ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : recommendedData?.content_recommendations?.length > 0 ? (
            <FlatList
              horizontal
              data={recommendedData.content_recommendations}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyText}>No recommendations available</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending</Text>
          {trendingLoading ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : trendingData?.trending_content?.length > 0 ? (
            <FlatList
              horizontal
              data={trendingData.trending_content}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyText}>No trending content</Text>
          )}
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
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  loader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 15,
  },
  mediaCard: {
    width: 140,
    marginHorizontal: 5,
  },
  poster: {
    width: 140,
    height: 210,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
  },
  posterPlaceholder: {
    width: 140,
    height: 210,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: 48,
  },
  mediaTitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#3A3A3C',
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
});
