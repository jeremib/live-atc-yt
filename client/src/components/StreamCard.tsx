import { useState, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaTimes, FaStop, FaCircle, FaTrash } from 'react-icons/fa';
import { Stream } from '@/lib/types';
import { AudioVisualizer } from './AudioVisualizer';
import { useStreams } from '@/contexts/StreamContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface StreamCardProps {
  stream: Stream;
  index: number;
}

const SWIPE_THRESHOLD = 100;

export function StreamCard({ stream, index }: StreamCardProps) {
  const {
    togglePlayback,
    toggleMute,
    setVolume,
    setFilter,
    setPan,
    removeStream,
    getAudioState,
    getReconnectState,
    focusedStreamId,
    setFocusedStreamId,
    isRecording,
    recordingStreamId,
    recordingDuration,
    startRecording,
    stopRecording,
    isCompact
  } = useStreams();

  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  // Get the current audio state for this stream
  const audioState = getAudioState(stream.id) || {
    volume: 0.8,
    currentTime: 0,
    isPlaying: false,
    isMuted: false,
    filterEnabled: false,
    filterFrequency: 3000
  };

  const filterEnabled = audioState.filterEnabled ?? false;
  const filterFrequency = audioState.filterFrequency ?? 3000;
  const pan = audioState.pan ?? 0;

  const reconnectState = getReconnectState(stream.id);
  const isAutoReconnecting = reconnectState?.isReconnecting ||
    (reconnectState !== undefined && reconnectState.retryCount > 0 && reconnectState.retryCount < reconnectState.maxRetries);
  const hasExceededRetries = reconnectState !== undefined && reconnectState.retryCount >= reconnectState.maxRetries;

  const isRecordingThis = isRecording && recordingStreamId === stream.id;
  const isRecordingOther = isRecording && recordingStreamId !== stream.id;
  const isLiveATC = stream.type !== 'youtube';

  // Extract ICAO code from stream name (leading 4 uppercase letters) or URL
  const icao = (() => {
    const nameMatch = stream.name.match(/^([A-Z]{4})\b/);
    if (nameMatch) return nameMatch[1];
    const urlMatch = stream.url.match(/\/play\/([a-z]{4})/i);
    if (urlMatch) return urlMatch[1].toUpperCase();
    return null;
  })();

  // Fetch airport metadata
  const { data: airportInfo } = useQuery({
    queryKey: ['/api/airports', icao],
    queryFn: async () => {
      if (!icao) return null;
      const res = await fetch(`/api/airports/${icao}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!icao && isLiveATC,
    staleTime: Infinity,
  });

  // Fetch live flight count
  const { data: flightData } = useQuery({
    queryKey: ['/api/flights', icao],
    queryFn: async () => {
      if (!icao) return null;
      const res = await fetch(`/api/flights/${icao}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!icao && isLiveATC,
    refetchInterval: 60 * 1000, // refresh every minute
  });

  // Fetch weather (METAR) data
  const { data: weatherData } = useQuery({
    queryKey: ['/api/weather', icao],
    queryFn: async () => {
      if (!icao) return null;
      const res = await fetch(`/api/weather/${icao}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!icao && isLiveATC,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  // Weather-based gradient backgrounds (must be fully opaque to cover swipe layer)
  const weatherGradient = (() => {
    if (!weatherData?.condition) return 'bg-white dark:bg-neutral-800';
    const gradients: Record<string, string> = {
      clear: 'bg-gradient-to-br from-sky-50 to-blue-50 dark:from-[#0c1929] dark:to-[#0f1a2e]',
      few_clouds: 'bg-gradient-to-br from-sky-50 to-slate-50 dark:from-[#111827] dark:to-[#1a2332]',
      scattered: 'bg-gradient-to-br from-slate-50 to-gray-100 dark:from-[#1a1f2e] dark:to-[#1f2937]',
      broken: 'bg-gradient-to-br from-gray-100 to-slate-200 dark:from-[#1f2533] dark:to-[#252d3a]',
      overcast: 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#252a30] dark:to-[#2a2f36]',
      rain: 'bg-gradient-to-br from-blue-100 to-slate-200 dark:from-[#111d2d] dark:to-[#1a2332]',
      snow: 'bg-gradient-to-br from-white to-blue-50 dark:from-[#1e2530] dark:to-[#151c28]',
      thunderstorm: 'bg-gradient-to-br from-purple-100 to-gray-200 dark:from-[#1a1525] dark:to-[#1f2028]',
      fog: 'bg-gradient-to-br from-gray-100 to-amber-50 dark:from-[#1f2028] dark:to-[#211f1a]',
      mist: 'bg-gradient-to-br from-gray-100 to-amber-50 dark:from-[#1f2028] dark:to-[#211f1a]',
    };
    return gradients[weatherData.condition] || 'bg-white dark:bg-neutral-800';
  })();

  // Weather icon mapping
  const weatherIcon = (() => {
    if (!weatherData?.condition) return null;
    const icons: Record<string, string> = {
      clear: '\u2600\uFE0F',
      few_clouds: '\u26C5',
      scattered: '\u26C5',
      broken: '\u2601\uFE0F',
      overcast: '\u2601\uFE0F',
      rain: '\uD83C\uDF27',
      snow: '\uD83C\uDF28',
      thunderstorm: '\u26C8',
      fog: '\uD83C\uDF2B',
      mist: '\uD83C\uDF2B',
    };
    return icons[weatherData.condition] || null;
  })();

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

    // Determine direction on first significant move
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
      return;
    }

    if (!isHorizontalSwipe.current) return;

    // Only allow left swipe (negative deltaX)
    const clampedX = Math.min(0, deltaX);
    setSwipeX(clampedX);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    if (swipeX < -SWIPE_THRESHOLD) {
      // Animate off screen then remove
      setSwipeX(-window.innerWidth);
      setTimeout(() => removeStream(stream.id), 300);
    } else {
      setSwipeX(0);
    }
    isHorizontalSwipe.current = null;
  }, [swipeX, removeStream, stream.id]);

  // Format recording duration as MM:SS
  const formatRecordingDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
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

  const handleRetry = async () => {
    setIsRetrying(true);
    toast({
      title: 'Reconnecting',
      description: `Attempting to reconnect to ${stream.name}...`
    });
    try {
      await togglePlayback(stream);
    } catch {
      toast({
        title: 'Connection Failed',
        description: 'Could not reconnect to the stream. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(stream.id, newVolume);
  };

  const handleRemove = () => {
    removeStream(stream.id);
  };

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

  const controlsDisabled = stream.status === 'error' || stream.status === 'connecting';
  const isFocused = focusedStreamId === stream.id;

  return (
    <div
      className={`relative rounded-lg shadow-md overflow-hidden border hover:shadow-lg transition-shadow cursor-pointer flex flex-col ${
        isFocused ? 'ring-2 ring-primary border-primary' : 'border-neutral-200 dark:border-neutral-700'
      }`}
      onClick={() => setFocusedStreamId(stream.id)}
    >
      {/* Red delete background revealed on swipe */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 z-0">
        <FaTrash className="text-white text-xl" />
      </div>

      {/* Swipeable card content */}
      <div
        className={`relative ${weatherGradient} flex flex-col flex-1 z-10`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Position badge for keyboard shortcut reference */}
        {index < 9 && (
          <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
        )}
        {/* Card header */}
        <div className={`flex justify-between items-start ${isCompact ? 'p-2' : 'p-4'} border-b border-neutral-200 dark:border-neutral-700`}>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{stream.name}</h3>
            {!isCompact && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {stream.type === 'suno' && stream.sunoTracks
                  ? `Track ${(stream.sunoCurrentTrack ?? 0) + 1}/${stream.sunoTracks.length}: ${stream.sunoTracks[stream.sunoCurrentTrack ?? 0]?.title ?? ''}`
                  : airportInfo ? `${airportInfo.name} — ${airportInfo.city}` : (stream.fileName || 'Unknown file')}
              </p>
            )}
          </div>
          <div className="flex items-center ml-2 shrink-0">
            <span className={`mr-2 px-2 py-1 rounded-full text-xs ${getStatusBadge()} flex items-center`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1"></span>
              <span>{stream.status === 'connected' ? 'Connected' :
                     stream.status === 'connecting' ? 'Connecting...' :
                     stream.status === 'error' ? 'Error' : 'Disconnected'}</span>
            </span>
            <button
              className="text-neutral-400 dark:text-neutral-500 hover:text-red-500 transition"
              aria-label="Remove stream"
              onClick={handleRemove}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Audio controls */}
        <div className={`${isCompact ? 'p-2' : 'p-4'} flex-1 flex flex-col`}>
          {/* Play button + status */}
          <div className="flex items-center mb-3">
            <button
              className={`${isCompact ? 'w-8 h-8' : 'w-12 h-12'} rounded-full ${
                controlsDisabled
                  ? 'bg-neutral-300 dark:bg-neutral-600 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dark'
              } flex items-center justify-center text-white shadow-sm transition`}
              aria-label="Play/Pause"
              disabled={controlsDisabled}
              onClick={() => togglePlayback(stream)}
            >
              {audioState.isPlaying ? <FaPause size={isCompact ? 10 : undefined} /> : <FaPlay size={isCompact ? 10 : undefined} />}
            </button>
            <div className="ml-3">
              <div className={`text-sm font-medium ${
                hasExceededRetries || stream.status === 'error' ? 'text-red-500'
                  : isAutoReconnecting ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-neutral-700 dark:text-neutral-200'
              }`}>
                {hasExceededRetries
                  ? 'Connection lost'
                  : isAutoReconnecting
                    ? `Reconnecting... (${reconnectState!.retryCount + 1}/${reconnectState!.maxRetries})`
                    : stream.status === 'error'
                      ? 'Connection Failed'
                      : audioState.isPlaying
                        ? 'Playing'
                        : 'Paused'}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {hasExceededRetries
                  ? 'Max retries exceeded'
                  : stream.status === 'error'
                    ? 'Stream unavailable'
                    : formatTime(audioState.currentTime)}
              </div>
            </div>
            {/* Weather + flight badges */}
            <div className="flex items-center gap-1.5 ml-auto">
              {weatherData && weatherIcon && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 flex items-center whitespace-nowrap gap-1"
                  title={`${weatherData.conditionLabel} — ${weatherData.rawMetar}`}
                >
                  <span>{weatherIcon}</span><span>{Math.round(weatherData.temp * 9 / 5 + 32)}°F</span>
                </span>
              )}
              {flightData?.count > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center whitespace-nowrap gap-1"
                  title={`${flightData.count} aircraft near ${icao}`}
                >
                  <span>✈</span><span>{flightData.count}</span>
                </span>
              )}
            </div>
            {/* Recording indicator inline with status */}
            {isRecordingThis && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-xs text-red-600 font-medium tabular-nums">
                  {formatRecordingDuration(recordingDuration)}
                </span>
              </div>
            )}
          </div>

          {/* Audio visualizer - hidden in compact mode */}
          {!isCompact && (
            <AudioVisualizer
              streamId={stream.id}
              isPlaying={audioState.isPlaying}
              isError={stream.status === 'error'}
              onRetry={handleRetry}
            />
          )}

          {/* EQ frequency slider (shown when filter enabled) */}
          {isLiveATC && filterEnabled && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">EQ</span>
              <input
                type="range"
                className="flex-1 h-1 accent-primary"
                min="500"
                max="8000"
                step="100"
                value={filterFrequency}
                onChange={(e) => setFilter(stream.id, true, parseInt(e.target.value))}
                disabled={controlsDisabled}
              />
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums w-12 text-right">
                {filterFrequency >= 1000 ? `${(filterFrequency / 1000).toFixed(1)}k` : `${filterFrequency}`} Hz
              </span>
            </div>
          )}

          {/* Stereo pan slider */}
          {isLiveATC && !isCompact && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">L</span>
              <input
                type="range"
                className="flex-1 h-1 accent-primary"
                min="-100"
                max="100"
                step="5"
                value={Math.round(pan * 100)}
                onChange={(e) => { e.stopPropagation(); setPan(stream.id, parseInt(e.target.value) / 100); }}
                disabled={controlsDisabled}
                title={`Pan: ${pan === 0 ? 'Center' : pan < 0 ? `${Math.round(Math.abs(pan) * 100)}% Left` : `${Math.round(pan * 100)}% Right`}`}
              />
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">R</span>
            </div>
          )}

          {/* Bottom row: volume + EQ/record controls */}
          <div className="flex items-center mt-auto pt-2">
            <button
              className={`p-1.5 ${
                controlsDisabled
                  ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-primary'
              } transition`}
              aria-label="Mute"
              disabled={controlsDisabled}
              onClick={() => toggleMute(stream.id)}
            >
              {audioState.isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            <input
              type="range"
              className={`flex-1 mx-1 ${controlsDisabled ? 'opacity-50' : ''}`}
              min="0"
              max="100"
              value={audioState.isMuted ? 0 : Math.round(audioState.volume * 100)}
              onChange={handleVolumeChange}
              disabled={controlsDisabled}
            />
            {/* EQ + Record on the right */}
            {isLiveATC && (
              <div className="flex items-center gap-1 ml-1">
                <button
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition ${
                    filterEnabled
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 border-neutral-200 dark:border-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300'
                  } ${controlsDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={controlsDisabled}
                  onClick={(e) => { e.stopPropagation(); setFilter(stream.id, !filterEnabled, filterFrequency); }}
                  title="Low-pass EQ filter"
                >
                  EQ
                </button>
                {isRecordingThis ? (
                  <button
                    className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                    aria-label="Stop recording"
                    onClick={(e) => { e.stopPropagation(); stopRecording(); }}
                    title="Stop recording"
                  >
                    <FaStop size={12} />
                  </button>
                ) : (
                  <button
                    className={`p-1 rounded border transition ${
                      controlsDisabled || isRecordingOther || !audioState.isPlaying
                        ? 'border-neutral-200 dark:border-neutral-600 text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                        : 'border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
                    }`}
                    aria-label="Record stream"
                    disabled={controlsDisabled || isRecordingOther || !audioState.isPlaying}
                    onClick={(e) => { e.stopPropagation(); startRecording(stream.id, stream.name); }}
                    title={!audioState.isPlaying ? 'Play first to record' : isRecordingOther ? 'Another stream recording' : 'Record'}
                  >
                    <FaCircle size={10} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer - hidden in compact mode */}
          {!isCompact && isLiveATC && (
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
              {stream.type === 'scanner' ? 'Source: Broadcastify / Format: MP3'
                : stream.type === 'noaa' ? 'Source: NOAA Weather Radio / Format: MP3'
                : stream.type === 'railroad' ? 'Source: Broadcastify / Format: MP3'
                : stream.type === 'somafm' ? 'Source: SomaFM / Format: MP3'
                : stream.type === 'suno' ? `Source: Suno / ${stream.sunoTracks?.length ?? 0} tracks`
                : 'Source: www.liveatc.net / Format: MP3'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
