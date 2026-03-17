import { Stream, AudioState, Playlist } from './types';

const STORAGE_KEYS = {
  STREAMS: 'liveatc_youtube_proxy_streams',
  AUDIO_STATES: 'liveatc_youtube_proxy_audio_states',
  APP_VERSION: 'liveatc_youtube_proxy_version',
  PLAYLISTS: 'atc_playlists',
};

// Current app version - increment this when making storage format changes
const CURRENT_APP_VERSION = '1.0.0';

// Utility function to check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__test_storage__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('LocalStorage is not available:', e);
    return false;
  }
};

// Save streams to localStorage
export const saveStreams = (streams: Stream[]): void => {
  if (!isLocalStorageAvailable()) {
    console.error("LocalStorage is not available for saving streams");
    return;
  }

  try {
    // Filter out any unnecessary data from streams
    const streamsToSave = streams.map(stream => ({
      name: stream.name,
      url: stream.url,
      type: stream.type,
      isPlaying: stream.isPlaying,
    }));
    
    console.log("Serializing and saving streams to localStorage:", streamsToSave);
    const serialized = JSON.stringify(streamsToSave);
    console.log("Serialized data:", serialized);
    
    localStorage.setItem(STORAGE_KEYS.STREAMS, serialized);
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_APP_VERSION);
    
    // Verify write
    const savedData = localStorage.getItem(STORAGE_KEYS.STREAMS);
    console.log("Verification - Data saved to localStorage:", savedData);
  } catch (error) {
    console.error('Error saving streams to localStorage:', error);
  }
};

// Save audio states to localStorage
export const saveAudioStates = (
  audioStates: Map<number, AudioState>
): void => {
  if (!isLocalStorageAvailable()) return;

  try {
    // Convert Map to array for storage
    const statesArray = Array.from(audioStates.entries()).map(
      ([streamId, state]) => ({
        streamId,
        volume: state.volume,
        isMuted: state.isMuted,
        isPlaying: state.isPlaying,
        filterEnabled: state.filterEnabled,
        filterFrequency: state.filterFrequency,
      })
    );
    
    localStorage.setItem(STORAGE_KEYS.AUDIO_STATES, JSON.stringify(statesArray));
  } catch (error) {
    console.error('Error saving audio states to localStorage:', error);
  }
};

// Load streams from localStorage
export const loadSavedStreams = (): Partial<Stream>[] | null => {
  if (!isLocalStorageAvailable()) return null;

  try {
    const savedVersion = localStorage.getItem(STORAGE_KEYS.APP_VERSION);
    const savedStreams = localStorage.getItem(STORAGE_KEYS.STREAMS);
    
    console.log("Loading from localStorage - Version:", savedVersion);
    console.log("Loading from localStorage - Saved Streams:", savedStreams);
    
    // Ensure we're using data from the current app version
    if (savedVersion !== CURRENT_APP_VERSION || !savedStreams) {
      console.log("No valid saved streams found in localStorage");
      return null;
    }
    
    const parsedStreams = JSON.parse(savedStreams);
    console.log("Parsed streams from localStorage:", parsedStreams);
    return parsedStreams;
  } catch (error) {
    console.error('Error loading streams from localStorage:', error);
    return null;
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
}[] | null => {
  if (!isLocalStorageAvailable()) return null;

  try {
    const savedStates = localStorage.getItem(STORAGE_KEYS.AUDIO_STATES);
    
    if (!savedStates) {
      return null;
    }
    
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