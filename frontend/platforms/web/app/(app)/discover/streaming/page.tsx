'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentCard } from '@/components/content/ContentCard';
import { ContentGrid } from '@/components/content/ContentGrid';

interface StreamingService {
  id: string;
  name: string;
  logo: string;
}

interface StreamingContent {
  id: number;
  title: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  year: number;
  rating: number;
  overview: string;
  services: StreamingService[];
  regions: string[];
}

const SERVICES = [
  { id: 'netflix', name: 'Netflix', logo: '/logos/netflix.png' },
  { id: 'prime', name: 'Prime Video', logo: '/logos/prime.png' },
  { id: 'disney', name: 'Disney+', logo: '/logos/disney.png' },
  { id: 'hbo', name: 'HBO Max', logo: '/logos/hbo.png' },
  { id: 'apple', name: 'Apple TV+', logo: '/logos/apple.png' },
  { id: 'hulu', name: 'Hulu', logo: '/logos/hulu.png' },
  { id: 'paramount', name: 'Paramount+', logo: '/logos/paramount.png' },
];

export default function StreamingDiscoverPage() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [genre, setGenre] = useState<string>('');
  const [region, setRegion] = useState('US');

  const { data: content, isLoading } = useQuery({
    queryKey: ['streaming-discover', selectedServices, mediaType, genre, region],
    queryFn: async () => {
      const params = new URLSearchParams({
        services: selectedServices.join(','),
        media_type: mediaType,
        genre: genre,
        region: region,
      });
      const response = await fetch(`/api/v1/discover/streaming?${params}`);
      if (!response.ok) throw new Error('Failed to fetch streaming content');
      return response.json() as Promise<StreamingContent[]>;
    },
    enabled: selectedServices.length > 0,
  });

  const handleToggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleAddToNTV = async (item: StreamingContent) => {
    try {
      const response = await fetch('/api/v1/acquisition/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: item.id,
          media_type: item.media_type,
          quality: 'best',
        }),
      });
      if (!response.ok) throw new Error('Failed to add to library');
      alert(`Added ${item.title} to your library!`);
    } catch (error) {
      console.error('Error adding to library:', error);
      alert('Failed to add to library. Please try again.');
    }
  };

  return (
    <div className="streaming-discover-page">
      <header className="page-header">
        <h1>Streaming Services</h1>
        <p className="subtitle">
          Discover content across Netflix, Prime, Disney+, and more
        </p>
      </header>

      <div className="filters">
        <div className="service-selector">
          <h3>Select Services</h3>
          <div className="service-grid">
            {SERVICES.map((service) => (
              <button
                key={service.id}
                className={`service-btn ${selectedServices.includes(service.id) ? 'selected' : ''}`}
                onClick={() => handleToggleService(service.id)}
              >
                <img src={service.logo} alt={service.name} />
                <span>{service.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)}>
            <option value="all">All Content</option>
            <option value="movie">Movies</option>
            <option value="tv">TV Shows</option>
          </select>

          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">All Genres</option>
            <option value="action">Action</option>
            <option value="comedy">Comedy</option>
            <option value="drama">Drama</option>
            <option value="scifi">Sci-Fi</option>
            <option value="horror">Horror</option>
          </select>

          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
          </select>
        </div>
      </div>

      {selectedServices.length === 0 && (
        <div className="empty-state">
          <p>Select one or more streaming services to see available content</p>
        </div>
      )}

      {isLoading && selectedServices.length > 0 && (
        <div className="loading">
          <p>Loading content...</p>
        </div>
      )}

      {content && content.length > 0 && (
        <ContentGrid>
          {content.map((item) => (
            <div key={`${item.media_type}-${item.id}`} className="streaming-item">
              <ContentCard
                title={item.title}
                posterUrl={
                  item.poster_path
                    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                    : '/placeholder-poster.png'
                }
                year={item.year}
                rating={item.rating}
                mediaType={item.media_type}
                onClick={() => {}}
              />

              <div className="item-footer">
                <div className="available-on">
                  {item.services.slice(0, 3).map((service) => (
                    <img
                      key={service.id}
                      src={service.logo}
                      alt={service.name}
                      className="service-badge"
                      title={service.name}
                    />
                  ))}
                  {item.services.length > 3 && (
                    <span className="more-services">+{item.services.length - 3}</span>
                  )}
                </div>

                <button
                  className="add-to-ntv-btn"
                  onClick={() => handleAddToNTV(item)}
                >
                  + Add to nTV
                </button>
              </div>
            </div>
          ))}
        </ContentGrid>
      )}

      {content && content.length === 0 && selectedServices.length > 0 && (
        <div className="empty-state">
          <p>No content found matching your filters</p>
        </div>
      )}
    </div>
  );
}
