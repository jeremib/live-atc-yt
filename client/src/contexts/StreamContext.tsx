import { createContext, useContext, ReactNode, useState, useMemo, useCallback, useEffect } from 'react';
import { Stream, StreamType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAudioStreams } from '@/hooks/useAudioStreams';
import { useAutoReconnect, ReconnectState } from '@/hooks/useAutoReconnect';
import { useStreamRecorder } from '@/hooks/useStreamRecorder';
import { saveStreams, loadStreams, clearSavedData } from '@/lib/localStorage';
import { useCompactMode } from '@/hooks/useCompactMode';

interface StreamContextType {
  streams: Stream[];
  isLoading: boolean;
  error: Error | null;
  addStream: (name: string, url: string, type?: string) => Stream;
  removeStream: (id: number) => void;
  updateStream: (id: number, data: Partial<Stream>) => void;
  clearAllStreams: () => void;
  audioStates: Map<number, any>;
  playStream: (stream: Stream) => Promise<boolean>;
  pauseStream: (streamId: number) => void;
  togglePlayback: (stream: Stream) => Promise<void>;
  setVolume: (streamId: number, volume: number) => void;
  toggleMute: (streamId: number) => void;
  setFilter: (streamId: number, enabled: boolean, frequency: number) => void;
  setPan: (streamId: number, pan: number) => void;
  getAudioState: (streamId: number) => any;
  focusedStreamId: number | null;
  setFocusedStreamId: (id: number | null) => void;
  isRecording: boolean;
  recordingStreamId: number | null;
  recordingDuration: number;
  startRecording: (streamId: number, streamName: string) => void;
  stopRecording: () => void;
  getReconnectState: (streamId: number) => ReconnectState | undefined;
  audioGraphs: Map<number, any>;
  isCompact: boolean;
  toggleCompact: () => void;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

function deriveFileName(url: string, type: string): string | undefined {
  if (type === 'liveatc' || url.endsWith('.pls')) {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
  if (type === 'scanner' || type === 'noaa' || type === 'railroad') {
    const parts = url.split('/');
    return `${type}-${parts[parts.length - 1]}`;
  }
  if (type === 'somafm') {
    const match = url.match(/\/([^/]+-128-mp3)$/);
    return match ? `somafm-${match[1]}` : 'somafm-stream';
  }
  if (type === 'youtube') {
    if (url.includes('list=')) {
      const match = url.match(/[?&]list=([^#&?]+)/);
      return match ? `playlist-${match[1]}` : 'youtube-playlist';
    }
    const match = url.match(/(?:v=|\/)([\w-]{11})(?:[^#&?]*)/);
    return match ? `video-${match[1]}` : 'youtube-video';
  }
  if (type === 'suno') {
    const match = url.match(/playlist\/([\w-]+)/);
    return match ? `suno-${match[1]}` : 'suno-playlist';
  }
  return undefined;
}

export function StreamProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [streams, setStreams] = useState<Stream[]>(() => loadStreams());
  const [focusedStreamId, setFocusedStreamId] = useState<number | null>(null);
  const { isCompact, toggleCompact } = useCompactMode();

  const {
    audioElements,
    audioStates,
    audioGraphs,
    playStream: rawPlayStream,
    pauseStream: rawPauseStream,
    togglePlayback: rawTogglePlayback,
    setVolume,
    toggleMute,
    setFilter,
    setPan,
    removeStream: cleanupStream,
    reconnectStream,
    playSunoTrack,
    onSunoTrackEndRef,
    getAudioState
  } = useAudioStreams();

  // Wire up Suno auto-advance: when a track ends, advance to the next one
  useEffect(() => {
    onSunoTrackEndRef.current = (streamId: number) => {
      setStreams(prev => {
        const stream = prev.find(s => s.id === streamId);
        if (!stream?.sunoTracks) return prev;

        const currentIdx = stream.sunoCurrentTrack ?? 0;
        const nextIdx = currentIdx + 1;

        if (nextIdx >= stream.sunoTracks.length) {
          // Playlist finished — loop back to start
          const next = prev.map(s =>
            s.id === streamId ? { ...s, sunoCurrentTrack: 0 } : s
          );
          saveStreams(next);
          playSunoTrack(streamId, stream.sunoTracks[0].audioUrl);
          return next;
        }

        const next = prev.map(s =>
          s.id === streamId ? { ...s, sunoCurrentTrack: nextIdx } : s
        );
        saveStreams(next);
        playSunoTrack(streamId, stream.sunoTracks[nextIdx].audioUrl);
        return next;
      });
    };
  }, [playSunoTrack]);

  const streamNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of streams) {
      map.set(s.id, s.name);
    }
    return map;
  }, [streams]);

  const { getReconnectState } = useAutoReconnect(
    audioElements,
    audioGraphs,
    audioStates,
    reconnectStream,
    streamNames
  );

  const {
    isRecording,
    recordingStreamId,
    recordingDuration,
    startRecording: rawStartRecording,
    stopRecording
  } = useStreamRecorder();

  const startRecording = (streamId: number, streamName: string) => {
    rawStartRecording(streamId, streamName, audioGraphs);
  };

  const addStream = useCallback((name: string, url: string, type: string = 'liveatc'): Stream => {
    const id = Date.now();
    const newStream: Stream = {
      id,
      name,
      url,
      type: type as StreamType,
      fileName: deriveFileName(url, type),
      status: 'disconnected',
      isPlaying: false,
      createdAt: new Date().toISOString(),
    };
    setStreams(prev => {
      const next = [...prev, newStream];
      saveStreams(next);
      return next;
    });
    return newStream;
  }, []);

  const removeStream = useCallback((id: number) => {
    cleanupStream(id);
    setStreams(prev => {
      const next = prev.filter(s => s.id !== id);
      saveStreams(next);
      return next;
    });
    toast({
      title: 'Stream Removed',
      description: 'The stream has been removed successfully.',
    });
  }, [cleanupStream, toast]);

  const updateStream = useCallback((id: number, data: Partial<Stream>) => {
    setStreams(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...data } : s);
      saveStreams(next);
      return next;
    });
  }, []);

  const clearAllStreams = useCallback(() => {
    // Cleanup all audio resources
    streams.forEach(s => cleanupStream(s.id));
    clearSavedData();
    setStreams([]);
    toast({
      title: 'Data cleared',
      description: 'All streams have been removed.',
    });
  }, [streams, cleanupStream, toast]);

  const playStream = async (stream: Stream) => {
    const success = await rawPlayStream(stream);
    return success;
  };

  const pauseStream = (streamId: number) => {
    rawPauseStream(streamId);
  };

  const togglePlayback = async (stream: Stream) => {
    const state = getAudioState(stream.id);
    if (state?.isPlaying) {
      pauseStream(stream.id);
    } else {
      await playStream(stream);
    }
  };

  return (
    <StreamContext.Provider
      value={{
        streams,
        isLoading: false,
        error: null,
        addStream,
        removeStream,
        updateStream,
        clearAllStreams,
        audioStates,
        playStream,
        pauseStream,
        togglePlayback,
        setVolume,
        toggleMute,
        setFilter,
        setPan,
        getAudioState,
        focusedStreamId,
        setFocusedStreamId,
        isRecording,
        recordingStreamId,
        recordingDuration,
        startRecording,
        stopRecording,
        getReconnectState,
        audioGraphs,
        isCompact,
        toggleCompact
      }}
    >
      {children}
    </StreamContext.Provider>
  );
}

export const useStreams = () => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error('useStreams must be used within a StreamProvider');
  }
  return context;
};
