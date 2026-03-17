import { useEffect, useRef } from 'react';
import { Stream } from '@/lib/types';

interface UseMediaSessionParams {
  streams: Stream[];
  audioStates: Map<number, any>;
  togglePlayback: (stream: Stream) => Promise<void>;
  pauseStream: (streamId: number) => void;
}

export function useMediaSession({ streams, audioStates, togglePlayback, pauseStream }: UseMediaSessionParams) {
  const activeStreamRef = useRef<Stream | null>(null);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Find the first stream that is currently playing
    const activeStream = streams.find((s) => {
      const state = audioStates.get(s.id);
      return state?.isPlaying;
    }) ?? null;

    activeStreamRef.current = activeStream;

    if (!activeStream) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      return;
    }

    // Set metadata for the active stream
    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeStream.name,
      artist: activeStream.type === 'youtube' ? 'YouTube' : 'LiveATC',
      album: 'ATC Listener',
      artwork: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    // Action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      const current = activeStreamRef.current;
      if (current) togglePlayback(current);
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      const current = activeStreamRef.current;
      if (current) pauseStream(current.id);
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (streams.length === 0) return;
      const current = activeStreamRef.current;
      const currentIndex = current ? streams.findIndex((s) => s.id === current.id) : -1;
      const nextIndex = (currentIndex + 1) % streams.length;
      togglePlayback(streams[nextIndex]);
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (streams.length === 0) return;
      const current = activeStreamRef.current;
      const currentIndex = current ? streams.findIndex((s) => s.id === current.id) : -1;
      const prevIndex = (currentIndex - 1 + streams.length) % streams.length;
      togglePlayback(streams[prevIndex]);
    });
  }, [streams, audioStates, togglePlayback, pauseStream]);

  // Clean up handlers on unmount
  useEffect(() => {
    return () => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, []);
}
