package search

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"library_service/internal/config"
)

// MediaItem represents a media document to be indexed in MeiliSearch.
type MediaItem struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Year        int      `json:"year,omitempty"`
	Type        string   `json:"type"`
	Overview    string   `json:"overview,omitempty"`
	Genres      []string `json:"genres,omitempty"`
	Directors   []string `json:"directors,omitempty"`
	Cast        []string `json:"cast,omitempty"`
	Rating      float64  `json:"rating,omitempty"`
	PosterURL   string   `json:"poster_url,omitempty"`
	Duration    float64  `json:"duration,omitempty"`
	Quality     string   `json:"quality,omitempty"`
	FamilyID    string   `json:"family_id,omitempty"`
	CreatedAt   string   `json:"created_at,omitempty"`
	UpdatedAt   string   `json:"updated_at,omitempty"`
}

// SearchResult represents a single result returned from MeiliSearch.
type SearchResult struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Year      int     `json:"year,omitempty"`
	Type      string  `json:"type"`
	Overview  string  `json:"overview,omitempty"`
	PosterURL string  `json:"poster_url,omitempty"`
	Rating    float64 `json:"rating,omitempty"`
	FamilyID  string  `json:"family_id,omitempty"`
}

// SearchResponse is the full response from a MeiliSearch query.
type SearchResponse struct {
	Hits             []SearchResult `json:"hits"`
	Query            string         `json:"query"`
	ProcessingTimeMs int            `json:"processingTimeMs"`
	EstimatedTotalHits int          `json:"estimatedTotalHits"`
}

// MeiliClient provides methods for indexing and searching media in MeiliSearch.
type MeiliClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	indexName  string
}

// NewMeiliClient creates a new MeiliSearch client from configuration.
func NewMeiliClient(cfg *config.Config) *MeiliClient {
	return &MeiliClient{
		baseURL: cfg.MeiliSearchURL,
		apiKey:  cfg.MeiliSearchKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		indexName: "media",
	}
}

// Setup creates the index and configures searchable/filterable attributes.
// Safe to call multiple times; MeiliSearch handles idempotency.
func (m *MeiliClient) Setup() error {
	// Create index.
	payload := map[string]string{
		"uid":        m.indexName,
		"primaryKey": "id",
	}
	if _, err := m.doRequest("POST", "/indexes", payload); err != nil {
		// Index may already exist; that is fine.
	}

	// Configure searchable attributes.
	searchable := []string{"title", "overview", "cast", "directors", "genres"}
	if _, err := m.doRequest("PUT", fmt.Sprintf("/indexes/%s/settings/searchable-attributes", m.indexName), searchable); err != nil {
		return fmt.Errorf("failed to configure searchable attributes: %w", err)
	}

	// Configure filterable attributes.
	filterable := []string{"type", "year", "genres", "quality", "family_id", "rating"}
	if _, err := m.doRequest("PUT", fmt.Sprintf("/indexes/%s/settings/filterable-attributes", m.indexName), filterable); err != nil {
		return fmt.Errorf("failed to configure filterable attributes: %w", err)
	}

	// Configure sortable attributes.
	sortable := []string{"year", "rating", "title", "created_at"}
	if _, err := m.doRequest("PUT", fmt.Sprintf("/indexes/%s/settings/sortable-attributes", m.indexName), sortable); err != nil {
		return fmt.Errorf("failed to configure sortable attributes: %w", err)
	}

	return nil
}

// IndexMedia adds or updates a media item in the search index.
func (m *MeiliClient) IndexMedia(media MediaItem) error {
	documents := []MediaItem{media}
	_, err := m.doRequest("POST", fmt.Sprintf("/indexes/%s/documents", m.indexName), documents)
	if err != nil {
		return fmt.Errorf("failed to index media %q: %w", media.ID, err)
	}
	return nil
}

// IndexMediaBatch adds or updates multiple media items in a single call.
func (m *MeiliClient) IndexMediaBatch(items []MediaItem) error {
	if len(items) == 0 {
		return nil
	}
	_, err := m.doRequest("POST", fmt.Sprintf("/indexes/%s/documents", m.indexName), items)
	if err != nil {
		return fmt.Errorf("failed to batch index %d media items: %w", len(items), err)
	}
	return nil
}

// SearchMedia queries the search index with optional filters.
func (m *MeiliClient) SearchMedia(query string, filters map[string]interface{}) (*SearchResponse, error) {
	searchPayload := map[string]interface{}{
		"q":     query,
		"limit": 50,
	}

	// Build filter string from the provided map.
	if len(filters) > 0 {
		filterParts := []string{}
		for key, value := range filters {
			switch v := value.(type) {
			case string:
				filterParts = append(filterParts, fmt.Sprintf("%s = %q", key, v))
			case int:
				filterParts = append(filterParts, fmt.Sprintf("%s = %d", key, v))
			case float64:
				filterParts = append(filterParts, fmt.Sprintf("%s = %f", key, v))
			default:
				filterParts = append(filterParts, fmt.Sprintf("%s = %q", key, fmt.Sprint(v)))
			}
		}
		if len(filterParts) > 0 {
			filterStr := ""
			for i, part := range filterParts {
				if i > 0 {
					filterStr += " AND "
				}
				filterStr += part
			}
			searchPayload["filter"] = filterStr
		}
	}

	respBody, err := m.doRequest("POST", fmt.Sprintf("/indexes/%s/search", m.indexName), searchPayload)
	if err != nil {
		return nil, fmt.Errorf("search failed for query %q: %w", query, err)
	}

	var searchResp SearchResponse
	if err := json.Unmarshal(respBody, &searchResp); err != nil {
		return nil, fmt.Errorf("failed to parse search response: %w", err)
	}

	return &searchResp, nil
}

// DeleteMedia removes a media item from the search index by ID.
func (m *MeiliClient) DeleteMedia(mediaID string) error {
	_, err := m.doRequest("DELETE", fmt.Sprintf("/indexes/%s/documents/%s", m.indexName, mediaID), nil)
	if err != nil {
		return fmt.Errorf("failed to delete media %q from index: %w", mediaID, err)
	}
	return nil
}

// doRequest executes an HTTP request against the MeiliSearch API.
func (m *MeiliClient) doRequest(method, path string, payload interface{}) ([]byte, error) {
	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		body = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, m.baseURL+path, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if m.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+m.apiKey)
	}

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("MeiliSearch API error (HTTP %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}
