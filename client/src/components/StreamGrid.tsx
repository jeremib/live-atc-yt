import { FaPlus } from 'react-icons/fa';
import { Stream } from '@/lib/types';
import { StreamCard } from './StreamCard';
import { YouTubeStreamCard } from './YouTubeStreamCard';
import { useStreams } from '@/contexts/StreamContext';

interface StreamGridProps {
  streams: Stream[];
  isLoading: boolean;
  onAddStreamClick: () => void;
}

export function StreamGrid({ streams, isLoading, onAddStreamClick }: StreamGridProps) {
  const { isCompact } = useStreams();

  const gridCols = isCompact
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  if (isLoading) {
    return (
      <div className={`grid ${gridCols} gap-6`}>
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden border border-neutral-200 dark:border-neutral-700 animate-pulse">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded-md w-1/2 mb-2"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-1/3"></div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
                  <div className="ml-3">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-md w-16 mb-1"></div>
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-md w-12"></div>
                  </div>
                </div>
                <div className="w-20 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-md"></div>
              </div>
              <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded-md mb-3"></div>
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-md w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render the appropriate card component based on stream type
  const renderStreamCard = (stream: Stream, index: number) => {
    if (stream.type === 'youtube') {
      return <YouTubeStreamCard key={stream.id} stream={stream} />;
    }
    return <StreamCard key={stream.id} stream={stream} index={index} />;
  };

  return (
    <div className={`grid ${gridCols} gap-6`}>
      {/* Stream cards */}
      {streams.map((stream, index) => renderStreamCard(stream, index))}
      
      {/* Add Stream Card */}
      <div 
        onClick={onAddStreamClick}
        className={`border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex flex-col justify-center items-center p-6 text-neutral-500 dark:text-neutral-400 hover:text-primary hover:border-primary transition cursor-pointer ${isCompact ? 'min-h-[150px]' : 'min-h-[250px]'}`}
      >
        <div className={`${isCompact ? 'w-10 h-10' : 'w-16 h-16'} rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4`}>
          <FaPlus className={isCompact ? 'text-lg' : 'text-2xl'} />
        </div>
        <p className="text-center font-medium">Add New Stream</p>
        {!isCompact && (
          <p className="text-center text-sm mt-1">Click to add a LiveATC or YouTube stream</p>
        )}
      </div>
    </div>
  );
}
