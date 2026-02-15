'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRecommendationWeights, usePersonalizedSuggestions } from '@/hooks/useRecommendations';
import { ContentCard } from '@/components/content/ContentCard';
import type { RecommendationWeights } from '@/hooks/useRecommendations';

export default function RecommendationSettingsPage() {
  const profileId = 'current-profile-id'; // TODO: Get from context
  const queryClient = useQueryClient();

  const { data: savedWeights } = useRecommendationWeights(profileId);
  const [weights, setWeights] = useState<RecommendationWeights>({
    genreMatch: 0.4,
    ratingSimilarity: 0.3,
    recency: 0.2,
    popularity: 0.1,
  });

  const { data: preview } = usePersonalizedSuggestions(profileId, weights, 6);

  useEffect(() => {
    if (savedWeights) {
      setWeights(savedWeights);
    }
  }, [savedWeights]);

  const saveMutation = useMutation({
    mutationFn: async (newWeights: RecommendationWeights) => {
      const response = await fetch('/api/v1/preferences/recommendations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: newWeights }),
      });
      if (!response.ok) throw new Error('Failed to save preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendation-weights'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-suggestions'] });
    },
  });

  const handleWeightChange = (key: keyof RecommendationWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(weights);
  };

  const handleReset = () => {
    setWeights({
      genreMatch: 0.4,
      ratingSimilarity: 0.3,
      recency: 0.2,
      popularity: 0.1,
    });
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const isNormalized = Math.abs(totalWeight - 1.0) < 0.01;

  return (
    <div className="recommendation-settings-page">
      <header className="page-header">
        <h1>Recommendation Settings</h1>
        <p className="subtitle">
          Customize how content recommendations are calculated for your profile
        </p>
      </header>

      <div className="settings-content">
        <div className="weights-panel">
          <h2>Recommendation Weights</h2>
          <p className="help-text">
            Adjust these sliders to control what factors matter most in your recommendations.
            All weights must add up to 1.0.
          </p>

          <div className="weight-controls">
            <div className="weight-control">
              <label>
                <span className="label-text">Genre Match</span>
                <span className="label-value">{(weights.genreMatch * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.genreMatch}
                onChange={(e) => handleWeightChange('genreMatch', parseFloat(e.target.value))}
                className="weight-slider"
              />
              <p className="weight-description">
                How important is matching your favorite genres?
              </p>
            </div>

            <div className="weight-control">
              <label>
                <span className="label-text">Rating Similarity</span>
                <span className="label-value">{(weights.ratingSimilarity * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.ratingSimilarity}
                onChange={(e) =>
                  handleWeightChange('ratingSimilarity', parseFloat(e.target.value))
                }
                className="weight-slider"
              />
              <p className="weight-description">
                How important is matching content you've rated highly?
              </p>
            </div>

            <div className="weight-control">
              <label>
                <span className="label-text">Recency</span>
                <span className="label-value">{(weights.recency * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.recency}
                onChange={(e) => handleWeightChange('recency', parseFloat(e.target.value))}
                className="weight-slider"
              />
              <p className="weight-description">
                How important is newer content vs older classics?
              </p>
            </div>

            <div className="weight-control">
              <label>
                <span className="label-text">Popularity</span>
                <span className="label-value">{(weights.popularity * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.popularity}
                onChange={(e) => handleWeightChange('popularity', parseFloat(e.target.value))}
                className="weight-slider"
              />
              <p className="weight-description">
                How important is general popularity vs hidden gems?
              </p>
            </div>
          </div>

          <div className="weight-summary">
            <p className={`total-weight ${isNormalized ? 'valid' : 'invalid'}`}>
              Total: {(totalWeight * 100).toFixed(0)}%
              {!isNormalized && <span className="warning"> (must equal 100%)</span>}
            </p>
          </div>

          <div className="actions">
            <button onClick={handleReset} className="reset-btn">
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={!isNormalized || saveMutation.isPending}
              className="save-btn"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {saveMutation.isSuccess && (
            <p className="success-message">Preferences saved successfully!</p>
          )}
        </div>

        <div className="preview-panel">
          <h2>Live Preview</h2>
          <p className="help-text">
            These recommendations update in real-time as you adjust the weights above.
          </p>

          {preview && preview.length > 0 ? (
            <div className="preview-grid">
              {preview.map((item: any) => (
                <div key={item.id} className="preview-item">
                  <ContentCard
                    title={item.title}
                    posterUrl={item.poster_path || '/placeholder-poster.png'}
                    year={item.year}
                    rating={item.rating}
                    mediaType={item.media_type || 'movie'}
                    onClick={() => {}}
                  />
                  <div className="score-badge">
                    Score: {(item.score * 100).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-preview">
              <p>No recommendations available. Try adjusting the weights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
