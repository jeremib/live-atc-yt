import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubePlayer as YTPlayer, YouTubeEvent } from 'react-youtube';
import { Stream, AudioState } from '@/lib/types';

interface YouTubePlayerProps {
  stream: Stream;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  onStateChange: (state: AudioState) => void;
  onError: (error: Error) => void;
}

// Function to extract YouTube video ID from URL
export function extractYouTubeID(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : null;
}

// Function to extract YouTube playlist ID from URL
export function extractYouTubePlaylistID(url: string): string | null {
  const regExp = /[?&]list=([^#\&\?]+)/;
  const match = url.match(regExp);
  
  return match ? match[1] : null;
}

export function YouTubePlayer({ 
  stream, 
  isPlaying, 
  isMuted, 
  volume, 
  onStateChange, 
  onError 
}: YouTubePlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Extract video ID and playlist ID from URL
  useEffect(() => {
    const extractedVideoId = extractYouTubeID(stream.url);
    const extractedPlaylistId = extractYouTubePlaylistID(stream.url);
    
    setVideoId(extractedVideoId);
    setPlaylistId(extractedPlaylistId);
  }, [stream.url]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!playerRef.current || !isReady) return;
    
    if (isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying, isReady]);

  // Handle volume/mute changes
  useEffect(() => {
    if (!playerRef.current || !isReady) return;
    
    if (isMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
      // Set volume (0-100)
      playerRef.current.setVolume(volume * 100);
    }
  }, [volume, isMuted, isReady]);

  // Handle player state changes
  const handleStateChange = (event: YouTubeEvent) => {
    if (!playerRef.current) return;
    
    // Map YouTube states to our AudioState
    const state: AudioState = {
      volume: event.target.getVolume() / 100,
      duration: event.target.getDuration(),
      currentTime: event.target.getCurrentTime(),
      isPlaying: event.data === 1, // 1 = playing
      isMuted: event.target.isMuted()
    };
    
    onStateChange(state);
  };

  // Handle player errors
  const handleError = (event: YouTubeEvent) => {
    const errorCodes: Record<number, string> = {
      2: "Invalid YouTube ID",
      5: "HTML5 player error",
      100: "Video not found",
      101: "Embedding not allowed",
      150: "Embedding not allowed"
    };
    
    const errorMessage = errorCodes[event.data] || "Unknown YouTube error";
    onError(new Error(errorMessage));
  };

  // Handle player ready event
  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsReady(true);
    
    // Initialize with current state
    const state: AudioState = {
      volume: event.target.getVolume() / 100,
      duration: event.target.getDuration(),
      currentTime: 0,
      isPlaying: false,
      isMuted: event.target.isMuted()
    };
    
    onStateChange(state);
    
    // Start playing if needed
    if (isPlaying) {
      event.target.playVideo();
    }
    
    // Set volume
    if (isMuted) {
      event.target.mute();
    } else {
      event.target.unMute();
      event.target.setVolume(volume * 100);
    }
  };

  // Don't render if no video ID
  if (!videoId) {
    return (
      <div className="w-full p-4 bg-gray-100 rounded-lg text-center">
        Invalid YouTube URL
      </div>
    );
  }

  return (
    <div className="youtube-player-container" style={{ display: 'block', width: '100%' }}>
      <YouTube
        videoId={videoId}
        opts={{
          height: '0',  // Hidden video, audio only
          width: '0',   // Hidden video, audio only
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            list: playlistId || undefined,
            listType: playlistId ? 'playlist' : undefined,
          },
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
        onError={handleError}
        onEnd={handleStateChange}
        onPause={handleStateChange}
        onPlay={handleStateChange}
        className="hidden"
      />
    </div>
  );
}