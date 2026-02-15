import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useDownloadedContent, useFavorites, useWatchLater } from '../hooks/useLibrary';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function LibraryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: downloadedData, loading: downloadedLoading } = useDownloadedContent();
  const { data: favoritesData, loading: favoritesLoading } = useFavorites();
  const { data: watchLaterData, loading: watchLaterLoading } = useWatchLater();

  const handlePlayMedia = (mediaId: string, title: string) => {
    navigation.navigate('Player', { mediaId, title });
  };

  const renderMediaItem = ({ item }: any) => {
    const media = item.media_item || item;
    return (
      <TouchableOpacity
        style={styles.mediaCard}
        onPress={() => handlePlayMedia(media.id, media.title)}
      >
        {media.poster_url ? (
          <Image source={{ uri: media.poster_url }} style={styles.poster} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>📺</Text>
          </View>
        )}
        <Text style={styles.mediaTitle} numberOfLines={2}>{media.title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Downloads</Text>
          {downloadedLoading ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : downloadedData?.media_items?.length > 0 ? (
            <FlatList
              horizontal
              data={downloadedData.media_items}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyText}>No downloaded content</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorites</Text>
          {favoritesLoading ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : favoritesData?.playlists?.[0]?.playlist_items?.length > 0 ? (
            <FlatList
              horizontal
              data={favoritesData.playlists[0].playlist_items}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyText}>No favorite content</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watch Later</Text>
          {watchLaterLoading ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : watchLaterData?.playlists?.[0]?.playlist_items?.length > 0 ? (
            <FlatList
              horizontal
              data={watchLaterData.playlists[0].playlist_items}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <Text style={styles.emptyText}>No saved content</Text>
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
  content: {
    flex: 1,
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
});
