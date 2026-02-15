/**
 * Hook for search functionality
 */

import { useState, useEffect } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const SEARCH_MEDIA = gql`
  query SearchMedia($query: String!) {
    media_items(
      where: {
        _or: [
          { title: { _ilike: $query } }
          { description: { _ilike: $query } }
          { genres: { _has_key: $query } }
        ]
      }
      order_by: { user_rating: desc_nulls_last }
      limit: 20
    ) {
      id
      title
      description
      poster_url
      backdrop_url
      type
      genres
      year
      user_rating
      user_rating_count
    }
  }
`;

const GET_POPULAR_SEARCHES = gql`
  query GetPopularSearches {
    search_analytics(
      order_by: { search_count: desc }
      limit: 10
      distinct_on: search_term
    ) {
      search_term
      search_count
    }
  }
`;

const GET_POPULAR_CONTENT = gql`
  query GetPopularContent {
    trending_content(
      where: { expires_at: { _gt: "now()" } }
      order_by: { trending_score: desc }
      limit: 10
    ) {
      id
      trending_score
      media_item {
        id
        title
        poster_url
        backdrop_url
        type
        genres
        user_rating
      }
    }
  }
`;

export function useSearch(query: string) {
  const [searchMedia, { data, loading, error }] = useLazyQuery(SEARCH_MEDIA);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      searchMedia({
        variables: { query: `%${debouncedQuery}%` },
      });
    }
  }, [debouncedQuery, searchMedia]);

  return {
    results: data?.media_items || [],
    loading,
    error,
  };
}

export function usePopularSearches() {
  return useQuery(GET_POPULAR_SEARCHES);
}

export function usePopularContent() {
  return useQuery(GET_POPULAR_CONTENT);
}
