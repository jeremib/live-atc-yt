import { useState, useRef, useCallback } from 'react';
import { StreamAudioGraph } from '@/lib/audioGraph';

interface UseStreamRecorderReturn {
  isRecording: boolean;
  recordingStreamId: number | null;
  recordingDuration: number;
  startRecording: (
    streamId: number,
    streamName: string,
    audioGraphs: Map<number, StreamAudioGraph>
  ) => void;
  stopRecording: () => void;
}

function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return ''; // let the browser pick
}

export function useStreamRecorder(): UseStreamRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStreamId, setRecordingStreamId] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamNameRef = useRef<string>('');

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(
    (
      streamId: number,
      streamName: string,
      audioGraphs: Map<number, StreamAudioGraph>
    ) => {
      // Already recording — ignore
      if (recorderRef.current && recorderRef.current.state !== 'inactive') return;

      const graph = audioGraphs.get(streamId);
      if (!graph) {
        console.error('useStreamRecorder: no audio graph for stream', streamId);
        return;
      }

      const mediaStream = graph.getRecordingStream();
      const mimeType = pickMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(mediaStream, options);
      } catch (err) {
        console.error('useStreamRecorder: failed to create MediaRecorder', err);
        return;
      }

      chunksRef.current = [];
      streamNameRef.current = streamName;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = () => {
        console.error('useStreamRecorder: recorder error');
        clearTimer();
        setIsRecording(false);
        setRecordingStreamId(null);
        setRecordingDuration(0);
        recorderRef.current = null;
      };

      recorder.onstop = () => {
        clearTimer();

        // Assemble the recorded data
        const ext = mimeType.includes('webm') || !mimeType ? 'webm' : 'ogg';
        const blobType = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });

        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, 19);
          const safeName = streamNameRef.current.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `ATC-${safeName}-${timestamp}.${ext}`;

          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Revoke after a short delay to let the download start
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }

        chunksRef.current = [];
        setIsRecording(false);
        setRecordingStreamId(null);
        setRecordingDuration(0);
        recorderRef.current = null;
      };

      recorderRef.current = recorder;
      recorder.start(1000); // collect data every second

      setIsRecording(true);
      setRecordingStreamId(streamId);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    },
    [clearTimer]
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.stop();
    // onstop handler takes care of cleanup and download
  }, []);

  return {
    isRecording,
    recordingStreamId,
    recordingDuration,
    startRecording,
    stopRecording,
  };
}
