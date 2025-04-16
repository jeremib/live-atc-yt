// Stream types
export type StreamType = 'liveatc' | 'youtube';

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
