import { Stream, AudioState } from './types';

const STORAGE_KEYS = {
  STREAMS: 'liveatc_youtube_proxy_streams',
  AUDIO_STATES: 'liveatc_youtube_proxy_audio_states',
  APP_VERSION: 'liveatc_youtube_proxy_version',
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
  if (!isLocalStorageAvailable()) return;

  try {
    // Filter out any unnecessary data from streams
    const streamsToSave = streams.map(stream => ({
      name: stream.name,
      url: stream.url,
      type: stream.type,
      isPlaying: stream.isPlaying,
    }));
    
    localStorage.setItem(STORAGE_KEYS.STREAMS, JSON.stringify(streamsToSave));
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_APP_VERSION);
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
    
    // Ensure we're using data from the current app version
    if (savedVersion !== CURRENT_APP_VERSION || !savedStreams) {
      return null;
    }
    
    return JSON.parse(savedStreams);
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