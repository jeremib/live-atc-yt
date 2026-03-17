import { useState, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaVolumeMute, FaVolumeUp, FaTrash } from 'react-icons/fa';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { YouTubePlayer, extractYouTubeID } from './YouTubePlayer';
import { Stream, AudioState } from '@/lib/types';
import { useStreams } from '@/contexts/StreamContext';

interface YouTubeStreamCardProps {
  stream: Stream;
}

const SWIPE_THRESHOLD = 100;

export function YouTubeStreamCard({ stream }: YouTubeStreamCardProps) {
  const { 
    togglePlayback, 
    setVolume, 
    toggleMute, 
    removeStream, 
    getAudioState,
    isCompact
  } = useStreams();
  
  const [error, setError] = useState<Error | null>(null);

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  
  // Get current audio state or use defaults
  const audioState = getAudioState(stream.id) || {
    volume: 0.8,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isMuted: false
  };
  
  const { isPlaying, volume, isMuted } = audioState;
  
  // Handle playback state changes
  const handleStateChange = (state: AudioState) => {
    // The YouTube component will propagate state changes to the audio context
  };
  
  // Handle errors
  const handleError = (err: Error) => {
    console.error('YouTube playback error:', err);
    setError(err);
  };
  
  // Format a timestamp (e.g. 3:45)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Get video thumbnail from YouTube ID
  const getThumbnail = () => {
    const videoId = extractYouTubeID(stream.url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };
  
  // Extract video or playlist title from the stream name
  const getTitle = () => {
    if (stream.name.includes(' - ')) {
      const parts = stream.name.split(' - ');
      return (
        <div>
          <div className="font-medium">{parts[0]}</div>
          {!isCompact && (
            <div className="text-sm text-gray-500 dark:text-gray-400">{parts.slice(1).join(' - ')}</div>
          )}
        </div>
      );
    }
    return <div className="font-medium">{stream.name}</div>;
  };
  
  // Determine badge content
  const getBadgeContent = () => {
    if (stream.url.includes('list=')) {
      return 'Playlist';
    }
    return 'Video';
  };

  // Swipe handlers (touch devices only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
      return;
    }

    if (!isHorizontalSwipe.current) return;

    const clampedX = Math.min(0, deltaX);
    setSwipeX(clampedX);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    if (swipeX < -SWIPE_THRESHOLD) {
      setSwipeX(-window.innerWidth);
      setTimeout(() => removeStream(stream.id), 300);
    } else {
      setSwipeX(0);
    }
    isHorizontalSwipe.current = null;
  }, [swipeX, removeStream, stream.id]);
  
  return (
    <div className="relative rounded-lg shadow-md overflow-hidden border border-neutral-200 dark:border-neutral-700 flex flex-col">
      {/* Red delete background revealed on swipe */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 z-0">
        <FaTrash className="text-white text-xl" />
      </div>

      {/* Swipeable card content */}
      <div
        className="relative bg-white dark:bg-neutral-800 flex flex-col flex-1 z-10"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`${isCompact ? 'p-2' : 'p-4'} border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center`}>
          <div className="flex items-center">
            <Badge variant="outline" className="mr-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-200 dark:border-red-800">
              YouTube {getBadgeContent()}
            </Badge>
            <Badge variant={stream.status === 'connected' ? 'outline' : 'secondary'}>
              {stream.status === 'connected' ? 'Connected' : stream.status}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => removeStream(stream.id)}
          >
            <FaTrash className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative">
          {/* Thumbnail area with play button overlay */}
          <div className={`relative w-full ${isCompact ? 'h-20' : 'h-32'} bg-neutral-100 dark:bg-neutral-900 overflow-hidden`}>
            {getThumbnail() ? (
              <img 
                src={getThumbnail() || ''} 
                alt={stream.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
                <span className="text-neutral-400 dark:text-neutral-500">No thumbnail</span>
              </div>
            )}
            
            {/* Play/pause button overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20 transition cursor-pointer"
              onClick={() => togglePlayback(stream)}
            >
              {isPlaying ? (
                <FaPause className={`text-white ${isCompact ? 'text-2xl' : 'text-4xl'}`} />
              ) : (
                <FaPlay className={`text-white ${isCompact ? 'text-2xl' : 'text-4xl'}`} />
              )}
            </div>
          </div>
        </div>
        
        <div className={`${isCompact ? 'p-2' : 'p-4'} flex-1 flex flex-col`}>
          {/* Title area */}
          <div className="flex justify-between items-start mb-3">
            {getTitle()}
          </div>

          {/* Controls - pinned to bottom */}
          <div className="flex items-center space-x-2 mt-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => toggleMute(stream.id)}
            >
              {isMuted || volume === 0 ? (
                <FaVolumeMute className="h-4 w-4" />
              ) : (
                <FaVolumeUp className="h-4 w-4" />
              )}
            </Button>
            
            <Slider
              defaultValue={[volume * 100]}
              max={100}
              step={1}
              onValueChange={(values) => setVolume(stream.id, values[0] / 100)}
              className="w-28"
            />
          </div>
          
          {/* Error message if any - hidden in compact mode */}
          {error && !isCompact && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
              Error: {error.message}
            </div>
          )}
          
          {/* Hidden YouTube player */}
          <div className="hidden">
            <YouTubePlayer
              stream={stream}
              isPlaying={isPlaying}
              isMuted={isMuted}
              volume={volume}
              onStateChange={handleStateChange}
              onError={handleError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
