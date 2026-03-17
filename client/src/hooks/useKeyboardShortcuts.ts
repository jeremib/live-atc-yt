import { useEffect } from 'react';
import { Stream } from '@/lib/types';

interface UseKeyboardShortcutsParams {
  streams: Stream[];
  focusedStreamId: number | null;
  togglePlayback: (stream: Stream) => Promise<void>;
  toggleMute: (streamId: number) => void;
  setFocusedStreamId: (id: number | null) => void;
}

export function useKeyboardShortcuts({
  streams,
  focusedStreamId,
  togglePlayback,
  toggleMute,
  setFocusedStreamId,
}: UseKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        if (focusedStreamId != null) {
          const stream = streams.find((s) => s.id === focusedStreamId);
          if (stream) {
            togglePlayback(stream);
          }
        }
        return;
      }

      if (event.key === 'Escape') {
        setFocusedStreamId(null);
        return;
      }

      const keyNumber = parseInt(event.key, 10);
      if (keyNumber >= 1 && keyNumber <= 9) {
        const stream = streams[keyNumber - 1];
        if (stream) {
          toggleMute(stream.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [streams, focusedStreamId, togglePlayback, toggleMute, setFocusedStreamId]);
}
