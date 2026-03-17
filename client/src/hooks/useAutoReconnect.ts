import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioState } from '@/lib/types';
import { StreamAudioGraph } from '@/lib/audioGraph';

export interface ReconnectState {
  retryCount: number;
  maxRetries: number;
  isReconnecting: boolean;
}

const MAX_RETRIES = 5;
const STALL_TIMEOUT_MS = 10_000;

function backoffDelay(retryCount: number): number {
  return Math.min(2000 * Math.pow(2, retryCount), 30_000);
}

function sendDropNotification(streamName: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Stream Disconnected', {
      body: `${streamName} has lost connection`,
      icon: '/icon-192.png'
    });
  }
}

export function useAutoReconnect(
  audioElements: Map<number, HTMLAudioElement>,
  audioGraphs: Map<number, StreamAudioGraph>,
  audioStates: Map<number, AudioState>,
  reconnectStream: (streamId: number) => void,
  streamNames?: Map<number, string>
) {
  const [reconnectStates, setReconnectStates] = useState<Map<number, ReconnectState>>(new Map());
  const stallTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const reconnectTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  // Track which streams we've already notified about to avoid duplicates
  const notifiedStreams = useRef<Set<number>>(new Set());

  const getReconnectState = useCallback(
    (streamId: number): ReconnectState | undefined => reconnectStates.get(streamId),
    [reconnectStates]
  );

  const resetReconnect = useCallback((streamId: number) => {
    // Clear any pending reconnect timer
    const timer = reconnectTimers.current.get(streamId);
    if (timer) {
      clearTimeout(timer);
      reconnectTimers.current.delete(streamId);
    }
    notifiedStreams.current.delete(streamId);
    setReconnectStates(prev => {
      const next = new Map(prev);
      next.delete(streamId);
      return next;
    });
  }, []);

  const attemptReconnect = useCallback((streamId: number) => {
    setReconnectStates(prev => {
      const current = prev.get(streamId);
      const retryCount = current?.retryCount ?? 0;

      if (current?.isReconnecting || retryCount >= MAX_RETRIES) {
        // If max retries reached, send notification (once)
        if (retryCount >= MAX_RETRIES && !notifiedStreams.current.has(streamId)) {
          notifiedStreams.current.add(streamId);
          const name = streamNames?.get(streamId) || `Stream #${streamId}`;
          sendDropNotification(name);
        }
        return prev;
      }

      const next = new Map(prev);
      next.set(streamId, { retryCount, maxRetries: MAX_RETRIES, isReconnecting: true });

      const delay = backoffDelay(retryCount);
      const timer = setTimeout(() => {
        reconnectStream(streamId);
        reconnectTimers.current.delete(streamId);
        setReconnectStates(p => {
          const n = new Map(p);
          const s = n.get(streamId);
          if (s) {
            const newRetryCount = s.retryCount + 1;
            n.set(streamId, {
              ...s,
              retryCount: newRetryCount,
              isReconnecting: false,
            });
            // Check if this was the last attempt
            if (newRetryCount >= MAX_RETRIES && !notifiedStreams.current.has(streamId)) {
              notifiedStreams.current.add(streamId);
              const name = streamNames?.get(streamId) || `Stream #${streamId}`;
              sendDropNotification(name);
            }
          }
          return n;
        });
      }, delay);
      reconnectTimers.current.set(streamId, timer);

      return next;
    });
  }, [reconnectStream, streamNames]);

  // Attach event listeners to audio elements
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    audioElements.forEach((audio, streamId) => {
      const onError = () => {
        attemptReconnect(streamId);
      };

      const onStalled = () => {
        // Only trigger reconnect if the stall persists
        const existing = stallTimers.current.get(streamId);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
          stallTimers.current.delete(streamId);
          // Only reconnect if the element is still supposed to be playing
          const state = audioStates.get(streamId);
          if (state?.isPlaying) {
            attemptReconnect(streamId);
          }
        }, STALL_TIMEOUT_MS);
        stallTimers.current.set(streamId, timer);
      };

      const onPlaying = () => {
        // Stream recovered — clear stall timer and reset reconnect state
        const stallTimer = stallTimers.current.get(streamId);
        if (stallTimer) {
          clearTimeout(stallTimer);
          stallTimers.current.delete(streamId);
        }
        resetReconnect(streamId);
      };

      audio.addEventListener('error', onError);
      audio.addEventListener('stalled', onStalled);
      audio.addEventListener('playing', onPlaying);

      cleanups.push(() => {
        audio.removeEventListener('error', onError);
        audio.removeEventListener('stalled', onStalled);
        audio.removeEventListener('playing', onPlaying);
      });
    });

    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [audioElements, audioStates, attemptReconnect, resetReconnect]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      stallTimers.current.forEach(t => clearTimeout(t));
      reconnectTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return { getReconnectState, resetReconnect };
}
