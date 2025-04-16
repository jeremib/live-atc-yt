import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  streamId: number;
  isPlaying: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export function AudioVisualizer({ streamId, isPlaying, isError = false, errorMessage, onRetry }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);
  
  // Create visualization bars
  useEffect(() => {
    if (!containerRef.current || isError) return;
    
    // Clear previous bars
    containerRef.current.innerHTML = '';
    barsRef.current = [];
    
    // Create bars
    const numBars = 30;
    for (let i = 0; i < numBars; i++) {
      const bar = document.createElement('div');
      bar.className = 'absolute bottom-0 w-[3px] bg-primary';
      bar.style.left = `${(i * 5) + 4}px`;
      bar.style.height = '5px';
      bar.style.animationDelay = `-${Math.random() * 0.9 + 0.1}s`;
      
      if (isPlaying) {
        bar.style.animation = 'equalize 1s infinite';
      }
      
      containerRef.current.appendChild(bar);
      barsRef.current.push(bar);
    }
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isPlaying, isError, streamId]);
  
  // Update animation when isPlaying changes
  useEffect(() => {
    if (!containerRef.current || isError) return;
    
    barsRef.current.forEach(bar => {
      if (isPlaying) {
        bar.style.animation = 'equalize 1s infinite';
      } else {
        bar.style.animation = 'none';
        bar.style.height = '5px';
      }
    });
  }, [isPlaying, isError]);
  
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
    <div 
      ref={containerRef}
      className={`h-10 relative overflow-hidden rounded mt-2 mb-3 ${isPlaying ? 'bg-primary/10' : 'bg-neutral-100'}`}
      style={{
        '@keyframes equalize': {
          '0%': { height: '5px' },
          '50%': { height: '20px' },
          '100%': { height: '5px' }
        }
      }}
    />
  );
}
