import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useSearch, usePopularContent } from '../hooks/useSearch';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const { results, loading } = useSearch(query);
  const { data: popularData, loading: popularLoading } = usePopularContent();

  const handlePlayMedia = (mediaId: string, title: string) => {
    navigation.navigate('Player', { mediaId, title });
  };

  const renderMediaItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.mediaCard}
      onPress={() => handlePlayMedia(item.id, item.title)}
    >
      {item.poster_url ? (
        <Image source={{ uri: item.poster_url }} style={styles.poster} />
      ) : (
        <View style={styles.posterPlaceholder}>
          <Text style={styles.posterPlaceholderText}>📺</Text>
        </View>
      )}
      <View style={styles.mediaInfo}>
        <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.mediaMeta}>
          {item.year} • {item.type}
          {item.user_rating && ` • ⭐ ${item.user_rating.toFixed(1)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPopularItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.popularCard}
      onPress={() => handlePlayMedia(item.media_item.id, item.media_item.title)}
    >
      {item.media_item.poster_url ? (
        <Image source={{ uri: item.media_item.poster_url }} style={styles.popularPoster} />
      ) : (
        <View style={styles.popularPosterPlaceholder}>
          <Text style={styles.posterPlaceholderText}>📺</Text>
        </View>
      )}
      <Text style={styles.popularTitle} numberOfLines={2}>{item.media_item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search media..."
          placeholderTextColor="#8E8E93"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView style={styles.content}>
        {query ? (
          <View>
            <Text style={styles.sectionTitle}>Results for "{query}"</Text>
            {loading ? (
              <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
            ) : results.length > 0 ? (
              <FlatList
                data={results}
                renderItem={renderMediaItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>No results found</Text>
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Popular</Text>
            {popularLoading ? (
              <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
            ) : popularData?.trending_content?.length > 0 ? (
              <FlatList
                horizontal
                data={popularData.trending_content}
                renderItem={renderPopularItem}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularList}
              />
            ) : (
              <Text style={styles.emptyText}>No popular content available</Text>
            )}
          </View>
        )}
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
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1C1C1E',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  loader: {
    paddingVertical: 20,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  mediaCard: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  poster: {
    width: 80,
    height: 120,
  },
  posterPlaceholder: {
    width: 80,
    height: 120,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: 32,
  },
  mediaInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  mediaTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mediaMeta: {
    color: '#8E8E93',
    fontSize: 13,
  },
  popularList: {
    paddingBottom: 20,
  },
  popularCard: {
    width: 140,
    marginRight: 12,
  },
  popularPoster: {
    width: 140,
    height: 210,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
  },
  popularPosterPlaceholder: {
    width: 140,
    height: 210,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularTitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
});
