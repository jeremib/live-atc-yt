import { useState, useRef, useEffect } from 'react';
import { Stream, AudioState } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { loadSavedAudioStates, saveAudioStates } from '@/lib/localStorage';
import { StreamAudioGraph, getAudioContext } from '@/lib/audioGraph';

export function useAudioStreams() {
  const [audioElements, setAudioElements] = useState<Map<number, HTMLAudioElement>>(new Map());
  const [audioStates, setAudioStates] = useState<Map<number, AudioState>>(new Map());
  const [audioGraphs, setAudioGraphs] = useState<Map<number, StreamAudioGraph>>(new Map());
  const { toast } = useToast();
  
  // Function to create a new audio element for a stream
  const createAudioElement = (stream: Stream) => {
    // Check if we already have an audio element for this stream
    if (audioElements.has(stream.id)) {
      return audioElements.get(stream.id)!;
    }
    
    // Create a new audio element
    const audio = new Audio();
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';

    // Create the Web Audio graph for this element.
    // Must happen before any audio.play() call because
    // createMediaElementSource can only be called once per element.
    const graph = new StreamAudioGraph(audio);

    // Set initial audio state
    const initialState: AudioState = {
      volume: 0.8,
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      isMuted: false,
      filterEnabled: false,
      filterFrequency: 3000,
      pan: 0
    };

    // Apply initial volume via the Web Audio gain node
    // (MediaElementAudioSourceNode takes over the element's output)
    graph.setGain(initialState.volume);
    
    // Set up event listeners
    audio.addEventListener('timeupdate', () => {
      setAudioStates(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(stream.id) || initialState;
        newMap.set(stream.id, {
          ...currentState,
          currentTime: audio.currentTime
        });
        return newMap;
      });
    });
    
    audio.addEventListener('durationchange', () => {
      setAudioStates(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(stream.id) || initialState;
        newMap.set(stream.id, {
          ...currentState,
          duration: audio.duration
        });
        return newMap;
      });
    });
    
    audio.addEventListener('play', () => {
      setAudioStates(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(stream.id) || initialState;
        newMap.set(stream.id, {
          ...currentState,
          isPlaying: true
        });
        return newMap;
      });
    });
    
    audio.addEventListener('pause', () => {
      setAudioStates(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(stream.id) || initialState;
        newMap.set(stream.id, {
          ...currentState,
          isPlaying: false
        });
        return newMap;
      });
    });
    
    audio.addEventListener('error', (e) => {
      toast({
        title: 'Stream Error',
        description: `Failed to play stream ${stream.name}. ${audio.error?.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    });
    
    // Update audio states and elements
    setAudioStates(prev => {
      const newMap = new Map(prev);
      newMap.set(stream.id, initialState);
      return newMap;
    });
    
    setAudioElements(prev => {
      const newMap = new Map(prev);
      newMap.set(stream.id, audio);
      return newMap;
    });

    setAudioGraphs(prev => {
      const newMap = new Map(prev);
      newMap.set(stream.id, graph);
      return newMap;
    });

    return audio;
  };
  
  // Function to play a stream
  const playStream = async (stream: Stream) => {
    try {
      // If this is a YouTube stream, we handle it differently
      if (stream.type === 'youtube') {
        // For YouTube streams, we don't need to create audio elements
        // The YouTube component will handle playback and sync state
        
        // Create a dummy state if it doesn't exist yet
        if (!audioStates.has(stream.id)) {
          setAudioStates(prev => {
            const newMap = new Map(prev);
            newMap.set(stream.id, {
              volume: 0.8,
              duration: 0,
              currentTime: 0,
              isPlaying: true,
              isMuted: false,
              filterEnabled: false,
              filterFrequency: 3000
            });
            return newMap;
          });
        } else {
          // Update the state to playing
          setAudioStates(prev => {
            const newMap = new Map(prev);
            const currentState = newMap.get(stream.id);
            if (currentState) {
              newMap.set(stream.id, {
                ...currentState,
                isPlaying: true
              });
            }
            return newMap;
          });
        }
        
        return true;
      }
      
      // For LiveATC streams, use the audio element approach
      let audio = audioElements.get(stream.id);
      
      // Create the audio element if it doesn't exist
      if (!audio) {
        audio = createAudioElement(stream);
      }
      
      // Set the source if not already set
      if (!audio.src) {
        // Use our proxy endpoint
        audio.src = `/api/proxy/${stream.id}`;
      }
      
      // Resume the AudioContext if suspended (required on iOS / Safari
      // where the context starts suspended until a user gesture).
      await getAudioContext().resume();

      // Play the stream
      await audio.play();
      
      return true;
    } catch (error) {
      console.error('Error playing stream:', error);
      toast({
        title: 'Playback Error',
        description: 'Could not play the stream. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  };
  
  // Function to pause a stream
  const pauseStream = (streamId: number) => {
    // Check if this is a YouTube stream
    const state = audioStates.get(streamId);
    const stream = { id: streamId } as Stream; // Basic stream object just for type
    
    if (state && !audioElements.has(streamId)) {
      // This is likely a YouTube stream, just update the state
      setAudioStates(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(streamId);
        if (currentState) {
          newMap.set(streamId, {
            ...currentState,
            isPlaying: false
          });
        }
        return newMap;
      });
    } else {
      // Regular LiveATC stream, pause the audio element
      const audio = audioElements.get(streamId);
      if (audio) {
        audio.pause();
      }
    }
  };
  
  // Function to toggle play/pause
  const togglePlayback = async (stream: Stream) => {
    // For YouTube streams
    if (stream.type === 'youtube') {
      const state = audioStates.get(stream.id);
      
      if (state) {
        // Toggle the isPlaying state
        setAudioStates(prev => {
          const newMap = new Map(prev);
          const currentState = newMap.get(stream.id);
          if (currentState) {
            newMap.set(stream.id, {
              ...currentState,
              isPlaying: !currentState.isPlaying
            });
          }
          return newMap;
        });
      } else {
        // If no state yet, initialize by playing
        await playStream(stream);
      }
      return;
    }
    
    // For LiveATC streams
    const audio = audioElements.get(stream.id);
    
    if (audio && audio.src) {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } else {
      await playStream(stream);
    }
  };
  
  // Function to set volume
  const setVolume = (streamId: number, volume: number) => {
    const audio = audioElements.get(streamId);
    const state = audioStates.get(streamId);
    const safeVolume = Math.max(0, Math.min(1, volume));
    
    // Check if this is likely a YouTube stream (no audio element but has state)
    if (!audio && state) {
      // Just update the state for YouTube
      setAudioStates(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(streamId);
        if (currentState) {
          newMap.set(streamId, {
            ...currentState,
            volume: safeVolume,
            isMuted: safeVolume === 0
          });
        }
        return newMap;
      });
    } 
    // Regular audio element for LiveATC streams – control volume via Web Audio gain
    else if (audio) {
      const graph = audioGraphs.get(streamId);
      if (graph) {
        graph.setGain(safeVolume);
      }

      setAudioStates(prev => {
        const newMap = new Map(prev);
        const currentState = newMap.get(streamId);
        if (currentState) {
          newMap.set(streamId, {
            ...currentState,
            volume: safeVolume,
            isMuted: safeVolume === 0
          });
        }
        return newMap;
      });
    }
  };
  
  // Function to set low-pass filter on a stream
  const setFilter = (streamId: number, enabled: boolean, frequency: number) => {
    const graph = audioGraphs.get(streamId);
    if (graph) {
      if (enabled) {
        graph.insertFilter('lowpass', frequency);
      } else {
        graph.removeFilter();
      }
    }

    setAudioStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(streamId);
      if (currentState) {
        newMap.set(streamId, {
          ...currentState,
          filterEnabled: enabled,
          filterFrequency: frequency
        });
      }
      return newMap;
    });
  };

  // Function to set stereo pan
  const setPan = (streamId: number, pan: number) => {
    const graph = audioGraphs.get(streamId);
    if (graph) {
      graph.setPan(pan);
    }

    setAudioStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(streamId);
      if (currentState) {
        newMap.set(streamId, { ...currentState, pan });
      }
      return newMap;
    });
  };

  // Function to toggle mute
  const toggleMute = (streamId: number) => {
    const audio = audioElements.get(streamId);
    const state = audioStates.get(streamId);
    
    // No state yet, nothing to toggle
    if (!state) return;
    
    // Check if this is likely a YouTube stream (no audio element)
    if (!audio) {
      // Just update the state for YouTube streams
      if (!state.isMuted) {
        setAudioStates(prev => {
          const newMap = new Map(prev);
          newMap.set(streamId, {
            ...state,
            // Store current volume and set muted
            isMuted: true 
          });
          return newMap;
        });
      } else {
        setAudioStates(prev => {
          const newMap = new Map(prev);
          newMap.set(streamId, {
            ...state,
            isMuted: false
          });
          return newMap;
        });
      }
    }
    // Regular audio element for LiveATC streams – use Web Audio gain for mute
    else if (audio && state) {
      const graph = audioGraphs.get(streamId);

      if (!state.isMuted) {
        // Mute: set gain to 0, keep the saved volume in state
        if (graph) graph.setGain(0);

        setAudioStates(prev => {
          const newMap = new Map(prev);
          newMap.set(streamId, {
            ...state,
            isMuted: true
          });
          return newMap;
        });
      } else {
        // Unmute: restore the saved volume
        const restoredVolume = state.volume > 0 ? state.volume : 0.8;
        if (graph) graph.setGain(restoredVolume);

        setAudioStates(prev => {
          const newMap = new Map(prev);
          newMap.set(streamId, {
            ...state,
            isMuted: false
          });
          return newMap;
        });
      }
    }
  };
  
  // Function to cleanup a stream
  const removeStream = (streamId: number) => {
    // Disconnect the Web Audio graph before tearing down the element
    const graph = audioGraphs.get(streamId);
    if (graph) {
      graph.disconnect();
    }

    const audio = audioElements.get(streamId);
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.load();
    }

    setAudioGraphs(prev => {
      const newMap = new Map(prev);
      newMap.delete(streamId);
      return newMap;
    });

    setAudioElements(prev => {
      const newMap = new Map(prev);
      newMap.delete(streamId);
      return newMap;
    });

    setAudioStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(streamId);
      return newMap;
    });
  };
  
  // Load saved audio states from localStorage on mount
  useEffect(() => {
    const savedStates = loadSavedAudioStates();
    if (savedStates && savedStates.length > 0) {
      const newAudioStates = new Map<number, AudioState>();
      
      savedStates.forEach(state => {
        // Create a proper AudioState from the saved data
        newAudioStates.set(state.streamId, {
          volume: state.volume || 0.8,
          duration: 0, // Will be updated when audio loads
          currentTime: 0, // Will be updated when audio plays
          isPlaying: false, // Always start paused
          isMuted: state.isMuted || false,
          filterEnabled: state.filterEnabled || false,
          filterFrequency: state.filterFrequency || 3000,
          pan: state.pan || 0
        });
      });
      
      // Update our state with the saved audio states
      setAudioStates(newAudioStates);
    }
  }, []);
  
  // Save audio states to localStorage whenever they change
  useEffect(() => {
    if (audioStates.size > 0) {
      saveAudioStates(audioStates);
    }
  }, [audioStates]);
  
  // Reconnect a stream by resetting its src without recreating the element.
  // The existing MediaElementAudioSourceNode graph stays intact.
  const reconnectStream = (streamId: number) => {
    const audio = audioElements.get(streamId);
    if (!audio) return;

    audio.pause();
    audio.removeAttribute('src');
    // Small delay to let the element settle before reloading
    setTimeout(() => {
      audio.src = `/api/proxy/${streamId}`;
      audio.play().catch((err) => {
        console.error('Reconnect play failed:', err);
      });
    }, 200);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  return {
    audioElements,
    audioStates,
    audioGraphs,
    playStream,
    pauseStream,
    togglePlayback,
    setVolume,
    toggleMute,
    setFilter,
    setPan,
    removeStream,
    reconnectStream,
    getAudioState: (streamId: number) => audioStates.get(streamId)
  };
}
