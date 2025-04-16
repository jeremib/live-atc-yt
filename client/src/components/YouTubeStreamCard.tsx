import { useState } from 'react';
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

export function YouTubeStreamCard({ stream }: YouTubeStreamCardProps) {
  const { 
    togglePlayback, 
    setVolume, 
    toggleMute, 
    removeStream, 
    getAudioState 
  } = useStreams();
  
  const [error, setError] = useState<Error | null>(null);
  
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
    // This is mostly handled by the useAudioStreams hook
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
    
    // Use medium quality thumbnail
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };
  
  // Extract video or playlist title from the stream name
  const getTitle = () => {
    if (stream.name.includes(' - ')) {
      const parts = stream.name.split(' - ');
      return (
        <div>
          <div className="font-medium">{parts[0]}</div>
          <div className="text-sm text-gray-500">{parts.slice(1).join(' - ')}</div>
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
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-neutral-200">
      <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2 bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
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
        <div className="relative w-full h-32 bg-neutral-100 overflow-hidden">
          {getThumbnail() ? (
            <img 
              src={getThumbnail() || ''} 
              alt={stream.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100">
              <span className="text-neutral-400">No thumbnail</span>
            </div>
          )}
          
          {/* Play/pause button overlay */}
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20 transition cursor-pointer"
            onClick={() => togglePlayback(stream)}
          >
            {isPlaying ? (
              <FaPause className="text-white text-4xl" />
            ) : (
              <FaPlay className="text-white text-4xl" />
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {/* Title area */}
        <div className="flex justify-between items-start mb-3">
          {getTitle()}
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2 mb-2">
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
        
        {/* Error message if any */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 text-red-700 rounded-md text-sm">
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
  );
}