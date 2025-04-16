import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stream } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAudioStreams } from '@/hooks/useAudioStreams';
import { 
  saveStreams, 
  saveAudioStates, 
  loadSavedStreams, 
  loadSavedAudioStates 
} from '@/lib/localStorage';

interface StreamContextType {
  streams: Stream[];
  isLoading: boolean;
  error: Error | null;
  addStream: (name: string, url: string, type?: string) => Promise<Stream | null>;
  removeStream: (id: number) => Promise<boolean>;
  updateStream: (id: number, data: Partial<Stream>) => Promise<Stream | null>;
  audioStates: Map<number, any>;
  playStream: (stream: Stream) => Promise<boolean>;
  pauseStream: (streamId: number) => void;
  togglePlayback: (stream: Stream) => Promise<void>;
  setVolume: (streamId: number, volume: number) => void;
  toggleMute: (streamId: number) => void;
  getAudioState: (streamId: number) => any;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export function StreamProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [isRestoringStreams, setIsRestoringStreams] = useState(false);
  
  const {
    audioStates,
    playStream,
    pauseStream,
    togglePlayback,
    setVolume,
    toggleMute,
    removeStream: cleanupStream,
    getAudioState
  } = useAudioStreams();
  
  // Fetch all streams
  const { 
    data: streams = [], 
    isLoading,
    isSuccess: streamsLoaded
  } = useQuery<Stream[]>({
    queryKey: ['/api/streams']
  });
  
  // Add a new stream
  const addStreamMutation = useMutation({
    mutationFn: async (data: { name: string; url: string; type: string }) => {
      const response = await apiRequest('POST', '/api/streams', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Stream Added',
        description: 'The stream has been added successfully.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error',
        description: `Failed to add stream: ${err.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Remove a stream
  const removeStreamMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/streams/${id}`);
      return id;
    },
    onSuccess: (id) => {
      cleanupStream(id); // Clean up audio resources
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
      toast({
        title: 'Stream Removed',
        description: 'The stream has been removed successfully.',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error',
        description: `Failed to remove stream: ${err.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Update a stream
  const updateStreamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Stream> }) => {
      const response = await apiRequest('PATCH', `/api/streams/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update stream: ${err.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Helper functions with proper error handling
  const addStream = async (name: string, url: string, type: string = 'liveatc'): Promise<Stream | null> => {
    try {
      return await addStreamMutation.mutateAsync({ name, url, type });
    } catch (error) {
      return null;
    }
  };
  
  const removeStream = async (id: number): Promise<boolean> => {
    try {
      await removeStreamMutation.mutateAsync(id);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  const updateStream = async (id: number, data: Partial<Stream>): Promise<Stream | null> => {
    try {
      return await updateStreamMutation.mutateAsync({ id, data });
    } catch (error) {
      return null;
    }
  };
  
  // Load saved streams from localStorage when the app first loads
  useEffect(() => {
    if (streams.length === 0 && !isRestoringStreams && streamsLoaded) {
      const savedStreams = loadSavedStreams();
      
      if (savedStreams && savedStreams.length > 0) {
        setIsRestoringStreams(true);
        
        // Display toast notification
        toast({
          title: 'Restoring streams',
          description: 'Restoring your previously saved streams...',
        });
        
        // Add each saved stream to the database
        const restoreStreams = async () => {
          for (const stream of savedStreams) {
            if (stream.name && stream.url && stream.type) {
              await addStream(stream.name, stream.url, stream.type);
            }
          }
          
          // Restore audio states after streams are loaded
          const savedAudioStates = loadSavedAudioStates();
          if (savedAudioStates) {
            // We'll handle audio states in another effect
          }
          
          setIsRestoringStreams(false);
          
          toast({
            title: 'Streams restored',
            description: 'Your streams have been restored successfully.',
          });
        };
        
        restoreStreams();
      }
    }
  }, [streams.length, streamsLoaded, isRestoringStreams]);
  
  // Save streams to localStorage whenever they change
  useEffect(() => {
    if (!isRestoringStreams && streams.length > 0) {
      saveStreams(streams);
    }
  }, [streams, isRestoringStreams]);
  
  // Save audio states to localStorage whenever they change
  useEffect(() => {
    if (audioStates.size > 0) {
      saveAudioStates(audioStates);
    }
  }, [audioStates]);
  
  return (
    <StreamContext.Provider
      value={{
        streams,
        isLoading,
        error,
        addStream,
        removeStream,
        updateStream,
        audioStates,
        playStream,
        pauseStream,
        togglePlayback,
        setVolume,
        toggleMute,
        getAudioState
      }}
    >
      {children}
    </StreamContext.Provider>
  );
}

export const useStreams = () => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error('useStreams must be used within a StreamProvider');
  }
  return context;
};
