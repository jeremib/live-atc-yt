import { useEffect, useRef } from 'react';
import { useStreams } from '@/contexts/StreamContext';

interface AudioVisualizerProps {
  streamId: number;
  isPlaying: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export function AudioVisualizer({ streamId, isPlaying, isError = false, errorMessage, onRetry }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const { audioGraphs } = useStreams();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isError) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const graph = audioGraphs?.get(streamId);
    const analyser = graph ? graph.getAnalyserNode() : null;

    if (analyser) {
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
    }

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (!isPlaying || !analyser || !dataArray) {
        // Draw flat idle bars
        const numBars = 32;
        const barWidth = (width / numBars) - 1;
        ctx.fillStyle = 'rgba(120, 120, 120, 0.15)';
        for (let i = 0; i < numBars; i++) {
          const x = i * (barWidth + 1);
          ctx.fillRect(x, height - 2, barWidth, 2);
        }
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      const numBars = 32;
      const barWidth = (width / numBars) - 1;
      const fadePx = width * 0.15; // 15% fade on each side

      for (let i = 0; i < numBars; i++) {
        // Map bar index to frequency data (skip very low freqs, focus on voice range)
        const dataIndex = Math.floor((i / numBars) * dataArray.length * 0.8) + 2;
        const value = dataArray[Math.min(dataIndex, dataArray.length - 1)];
        const barHeight = Math.max(2, (value / 255) * height * 0.9);

        const x = i * (barWidth + 1);

        // Calculate fade alpha based on position
        let alpha = 1;
        if (x < fadePx) {
          alpha = x / fadePx;
        } else if (x + barWidth > width - fadePx) {
          alpha = (width - x - barWidth) / fadePx;
        }
        alpha = Math.max(0, Math.min(1, alpha));

        // Get computed primary color or fallback
        const style = getComputedStyle(document.documentElement);
        const primary = style.getPropertyValue('--primary').trim();
        ctx.fillStyle = primary
          ? `hsla(${primary}, ${alpha})`
          : `rgba(59, 130, 246, ${alpha})`;

        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    // Set canvas resolution to match display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      // Reset the logical size for drawing
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();

    if (isPlaying && analyser) {
      const loop = () => {
        draw();
        animationRef.current = requestAnimationFrame(loop);
      };
      loop();
    } else {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isError, streamId, audioGraphs]);

  if (isError) {
    return (
      <div className="rounded mt-2 mb-3 bg-red-500/10 py-2 px-3 text-red-500 text-sm flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span>{errorMessage || 'Unable to connect to stream. Try refreshing.'}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-primary hover:text-primary-dark text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Retry connection
          </button>
        )}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-10 rounded mt-2 mb-3 ${isPlaying ? 'bg-primary/5' : 'bg-neutral-100 dark:bg-neutral-700'}`}
    />
  );
}
