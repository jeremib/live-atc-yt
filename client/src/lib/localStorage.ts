import { Stream, AudioState, Playlist, StreamType } from './types';

const STORAGE_KEYS = {
  STREAMS: 'liveatc_youtube_proxy_streams',
  AUDIO_STATES: 'liveatc_youtube_proxy_audio_states',
  APP_VERSION: 'liveatc_youtube_proxy_version',
  PLAYLISTS: 'atc_playlists',
};

const CURRENT_APP_VERSION = '2.0.0';

const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__test_storage__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Save streams to localStorage
export const saveStreams = (streams: Stream[]): void => {
  if (!isLocalStorageAvailable()) return;

  try {
    const streamsToSave = streams.map(stream => ({
      id: stream.id,
      name: stream.name,
      url: stream.url,
      type: stream.type,
      fileName: stream.fileName,
      ...(stream.sunoTracks ? { sunoTracks: stream.sunoTracks } : {}),
    }));

    localStorage.setItem(STORAGE_KEYS.STREAMS, JSON.stringify(streamsToSave));
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_APP_VERSION);
  } catch (error) {
    console.error('Error saving streams to localStorage:', error);
  }
};

// Saved stream shape (subset of Stream)
interface SavedStream {
  id?: number;
  name: string;
  url: string;
  type: StreamType;
  fileName?: string;
}

// Load streams from localStorage and hydrate into full Stream objects
export const loadStreams = (): Stream[] => {
  if (!isLocalStorageAvailable()) return [];

  try {
    const savedStreams = localStorage.getItem(STORAGE_KEYS.STREAMS);
    if (!savedStreams) return [];

    const parsed: SavedStream[] = JSON.parse(savedStreams);
    if (!Array.isArray(parsed)) return [];

    // Migrate: old format may lack IDs
    return parsed.map((s, i) => ({
      id: s.id ?? Date.now() + i,
      name: s.name,
      url: s.url,
      type: s.type || 'liveatc' as StreamType,
      fileName: s.fileName,
      status: 'disconnected' as const,
      isPlaying: false,
      createdAt: new Date().toISOString(),
      ...(s.sunoTracks ? { sunoTracks: s.sunoTracks, sunoCurrentTrack: 0 } : {}),
    }));
  } catch (error) {
    console.error('Error loading streams from localStorage:', error);
    return [];
  }
};

// Save audio states to localStorage
export const saveAudioStates = (
  audioStates: Map<number, AudioState>
): void => {
  if (!isLocalStorageAvailable()) return;

  try {
    const statesArray = Array.from(audioStates.entries()).map(
      ([streamId, state]) => ({
        streamId,
        volume: state.volume,
        isMuted: state.isMuted,
        isPlaying: state.isPlaying,
        filterEnabled: state.filterEnabled,
        filterFrequency: state.filterFrequency,
        pan: state.pan,
      })
    );

    localStorage.setItem(STORAGE_KEYS.AUDIO_STATES, JSON.stringify(statesArray));
  } catch (error) {
    console.error('Error saving audio states to localStorage:', error);
  }
};

// Load audio states from localStorage
export const loadSavedAudioStates = (): {
  streamId: number;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  filterEnabled: boolean;
  filterFrequency: number;
  pan?: number;
}[] | null => {
  if (!isLocalStorageAvailable()) return null;

  try {
    const savedStates = localStorage.getItem(STORAGE_KEYS.AUDIO_STATES);
    if (!savedStates) return null;
    return JSON.parse(savedStates);
  } catch (error) {
    console.error('Error loading audio states from localStorage:', error);
    return null;
  }
};

// Save playlists to localStorage
export const savePlaylists = (playlists: Playlist[]): void => {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  } catch (error) {
    console.error('Error saving playlists to localStorage:', error);
  }
};

// Load playlists from localStorage
export const loadPlaylists = (): Playlist[] => {
  if (!isLocalStorageAvailable()) return [];

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (error) {
    console.error('Error loading playlists from localStorage:', error);
    return [];
  }
};

// Clear all saved data
export const clearSavedData = (): void => {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.removeItem(STORAGE_KEYS.STREAMS);
    localStorage.removeItem(STORAGE_KEYS.AUDIO_STATES);
  } catch (error) {
    console.error('Error clearing saved data from localStorage:', error);
  }
};
