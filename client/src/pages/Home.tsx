import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { StreamGrid } from '@/components/StreamGrid';
import { AddStreamModal } from '@/components/AddStreamModal';
import { useStreams } from '@/contexts/StreamContext';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(false);

  const { streams, isLoading, audioStates, togglePlayback, pauseStream, toggleMute, focusedStreamId, setFocusedStreamId } = useStreams();

  useMediaSession({ streams, audioStates, togglePlayback, pauseStream });
  useKeyboardShortcuts({ streams, focusedStreamId, togglePlayback, toggleMute, setFocusedStreamId });
  
  // Check server connectivity
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/streams');
        setIsServerConnected(response.ok);
      } catch (error) {
        setIsServerConnected(false);
      }
    };
    
    // Check on load
    checkConnection();
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Modal handlers
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 min-h-screen">
      <Header isConnected={isServerConnected} onAddStreamClick={openModal} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status indicator for mobile */}
        <div className="md:hidden mb-4">
          <span className={`${isServerConnected ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'} px-2 py-1 rounded-full flex items-center inline-block text-sm`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isServerConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>{isServerConnected ? 'Proxy Server Connected' : 'Proxy Server Disconnected'}</span>
          </span>
        </div>
        
        {/* Stream grid */}
        <StreamGrid 
          streams={streams} 
          isLoading={isLoading}
          onAddStreamClick={openModal}
        />
      </main>
      
      {/* Add Stream Modal */}
      <AddStreamModal 
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
