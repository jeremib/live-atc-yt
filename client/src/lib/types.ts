// Stream types
export type StreamType = 'liveatc' | 'youtube' | 'scanner' | 'noaa' | 'railroad' | 'somafm';

// Stream statuses
export type StreamStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Stream interface
export interface Stream {
  id: number;
  name: string;
  url: string;
  fileName?: string;
  type: StreamType;
  status: StreamStatus;
  isPlaying: boolean;
  createdAt: string;
}

// Audio player state
export interface AudioState {
  volume: number;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  filterEnabled: boolean;
  filterFrequency: number;
  pan: number; // -1 (left) to 1 (right), 0 = center
}

// Form data for adding a new stream
export interface AddStreamFormData {
  name: string;
  url: string;
}

// Popular presets for quick-adding streams
export interface StreamPreset {
  name: string;
  url: string;
}

// Playlist types
export interface PlaylistStream {
  name: string;
  url: string;
  type: StreamType;
}

export interface Playlist {
  id: string;        // unique ID (use Date.now().toString())
  name: string;
  streams: PlaylistStream[];
  createdAt: string;  // ISO date string
}
