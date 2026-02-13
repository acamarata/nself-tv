export interface UploadProgress {
  id: string;
  filename: string;
  size: number;
  bytesUploaded: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface ScanStatus {
  scanId: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  type: 'full' | 'path';
  path?: string;
  totalFiles: number;
  filesProcessed: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

export interface MetadataSearchResult {
  providerId: string;
  providerName: string;
  externalId: string;
  title: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  contentRating: string | null;
}

export interface LibraryFilter {
  type?: string;
  genre?: string;
  sort?: string;
  search?: string;
}
