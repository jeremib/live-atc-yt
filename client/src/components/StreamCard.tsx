import { useState } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaTimes } from 'react-icons/fa';
import { Stream } from '@/lib/types';
import { AudioVisualizer } from './AudioVisualizer';
import { useStreams } from '@/contexts/StreamContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface StreamCardProps {
  stream: Stream;
}

export function StreamCard({ stream }: StreamCardProps) {
  const { 
    togglePlayback, 
    toggleMute, 
    setVolume, 
    removeStream,
    getAudioState 
  } = useStreams();
  
  const [isRetrying, setIsRetrying] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get the current audio state for this stream
  const audioState = getAudioState(stream.id) || {
    volume: 0.8,
    currentTime: 0,
    isPlaying: false,
    isMuted: false
  };
  
  // Format time
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return [h, m, s]
      .map(v => v < 10 ? `0${v}` : v)
      .join(':');
  };
  
  // Retry connecting to a stream
  const retryStreamMutation = useMutation({
    mutationFn: async (id: number) => {
      setIsRetrying(true);
      const response = await apiRequest('PATCH', `/api/streams/${id}`, { status: 'connecting' });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Reconnecting',
        description: `Attempting to reconnect to ${data.name}...`
      });
      
      // We'll attempt to play the stream after a short delay
      setTimeout(() => {
        togglePlayback(data);
        setIsRetrying(false);
      }, 1000);
    },
    onError: () => {
      setIsRetrying(false);
      toast({
        title: 'Connection Failed',
        description: 'Could not reconnect to the stream. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Handle retry
  const handleRetry = () => {
    retryStreamMutation.mutate(stream.id);
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(stream.id, newVolume);
  };
  
  // Handle remove stream
  const handleRemove = () => {
    removeStream(stream.id);
  };
  
  // Determine the status badge style
  const getStatusBadge = () => {
    switch(stream.status) {
      case 'connected':
        return 'bg-green-500/20 text-green-500';
      case 'connecting':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'error':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-neutral-500/20 text-neutral-500';
    }
  };
  
  // Determine if controls should be disabled
  const controlsDisabled = stream.status === 'error' || stream.status === 'connecting';
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-neutral-200 hover:shadow-lg transition">
      {/* Card header */}
      <div className="flex justify-between items-center p-4 border-b border-neutral-200">
        <div>
          <h3 className="font-semibold text-neutral-800">{stream.name}</h3>
          <p className="text-sm text-neutral-500 font-mono">{stream.fileName || 'Unknown file'}</p>
        </div>
        <div className="flex items-center">
          <span className={`mr-2 px-2 py-1 rounded-full text-xs ${getStatusBadge()} flex items-center`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1"></span>
            <span>{stream.status === 'connected' ? 'Connected' : 
                   stream.status === 'connecting' ? 'Connecting...' : 
                   stream.status === 'error' ? 'Error' : 'Disconnected'}</span>
          </span>
          <button 
            className="text-neutral-400 hover:text-red-500 transition"
            aria-label="Remove stream"
            onClick={handleRemove}
          >
            <FaTimes />
          </button>
        </div>
      </div>
      
      {/* Audio controls */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <button 
              className={`w-12 h-12 rounded-full ${
                controlsDisabled 
                  ? 'bg-neutral-300 cursor-not-allowed' 
                  : 'bg-primary hover:bg-primary-dark'
              } flex items-center justify-center text-white shadow-sm transition`}
              aria-label="Play/Pause"
              disabled={controlsDisabled}
              onClick={() => togglePlayback(stream)}
            >
              {audioState.isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <div className="ml-3">
              <div className={`text-sm font-medium ${stream.status === 'error' ? 'text-red-500' : 'text-neutral-700'}`}>
                {stream.status === 'error' 
                  ? 'Connection Failed' 
                  : audioState.isPlaying 
                    ? 'Playing' 
                    : 'Paused'}
              </div>
              <div className="text-xs text-neutral-500">
                {stream.status === 'error' 
                  ? 'Stream unavailable' 
                  : formatTime(audioState.currentTime)}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <button 
              className={`p-2 ${
                controlsDisabled 
                  ? 'text-neutral-300 cursor-not-allowed' 
                  : 'text-neutral-500 hover:text-primary'
              } transition`}
              aria-label="Mute"
              disabled={controlsDisabled}
              onClick={() => toggleMute(stream.id)}
            >
              {audioState.isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            <input 
              type="range" 
              className={`w-20 ml-2 ${controlsDisabled ? 'opacity-50' : ''}`}
              min="0" 
              max="100" 
              value={audioState.isMuted ? 0 : Math.round(audioState.volume * 100)}
              onChange={handleVolumeChange}
              disabled={controlsDisabled}
            />
          </div>
        </div>
        
        {/* Audio visualizer */}
        <AudioVisualizer 
          streamId={stream.id} 
          isPlaying={audioState.isPlaying} 
          isError={stream.status === 'error'}
          onRetry={handleRetry}
        />
        
        <div className="text-xs text-neutral-500 mt-2">
          <span className="mr-3">Source: www.liveatc.net</span>
          <span>Format: MP3</span>
        </div>
      </div>
    </div>
  );
}
