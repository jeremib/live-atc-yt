import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaPlus } from 'react-icons/fa';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useStreams } from '@/contexts/StreamContext';
import { AddStreamFormData, StreamType, StreamPreset } from '@/lib/types';
import { extractYouTubeID } from './YouTubePlayer';

// Popular LiveATC streams presets
const LIVEATC_PRESETS: StreamPreset[] = [
  { 
    name: 'KATL (Atlanta) Tower',
    url: 'https://www.liveatc.net/play/katl_twr.pls'
  },
  { 
    name: 'KJFK (New York JFK) Tower',
    url: 'https://www.liveatc.net/play/kjfk_twr.pls'
  },
  { 
    name: 'KLAX (Los Angeles) Tower',
    url: 'https://www.liveatc.net/play/klax_twr.pls'
  },
  { 
    name: 'EGLL (London Heathrow) Tower',
    url: 'https://www.liveatc.net/play/egll_twr.pls'
  }
];

// Popular YouTube audio streams
const YOUTUBE_PRESETS: StreamPreset[] = [
  {
    name: 'Lofi Hip Hop Radio',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
  },
  {
    name: 'Classical Music Playlist',
    url: 'https://www.youtube.com/watch?v=mIYzp5rcTvU'
  },
  {
    name: 'Nature Sounds - Relaxing Rain',
    url: 'https://www.youtube.com/watch?v=q76bMs-NwRk'
  },
  {
    name: 'Ambient Music Mix',
    url: 'https://www.youtube.com/watch?v=qvXsKZo3eFM'
  }
];

interface AddStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddStreamModal({ isOpen, onClose }: AddStreamModalProps) {
  const { addStream } = useStreams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'liveatc' | 'youtube'>('liveatc');
  
  // Form validation schema
  const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    url: z.string().url('Must be a valid URL')
  });
  
  // Initialize form
  const form = useForm<AddStreamFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: ''
    }
  });
  
  // URL validation based on stream type
  const validateURL = (url: string, type: StreamType): boolean => {
    if (type === 'liveatc') {
      // LiveATC URLs generally point to .pls files or have specific domains
      return url.includes('liveatc.net') || url.endsWith('.pls');
    } else if (type === 'youtube') {
      // Check if URL is a valid YouTube URL
      return (
        (url.includes('youtube.com') || url.includes('youtu.be')) &&
        !!extractYouTubeID(url)
      );
    }
    return false;
  };
  
  // Handle form submission
  const onSubmit = async (formData: AddStreamFormData) => {
    setIsLoading(true);
    
    try {
      if (!validateURL(formData.url, activeTab)) {
        toast({
          title: 'Invalid URL',
          description: activeTab === 'liveatc' 
            ? 'Please enter a valid LiveATC URL' 
            : 'Please enter a valid YouTube URL',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      
      // Add the stream with the appropriate type
      const stream = await addStream(formData.name, formData.url, activeTab);
      
      if (stream) {
        toast({
          title: 'Stream Added',
          description: `${formData.name} has been added successfully`
        });
        form.reset();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add stream. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error adding stream:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle quick selection of a popular stream
  const handleSelectPopularStream = (preset: StreamPreset) => {
    form.setValue('name', preset.name);
    form.setValue('url', preset.url);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stream</DialogTitle>
          <DialogDescription>
            Add a new audio stream to listen to simultaneously with others
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue="liveatc" 
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'liveatc' | 'youtube')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="liveatc">LiveATC Stream</TabsTrigger>
            <TabsTrigger value="youtube">YouTube Audio</TabsTrigger>
          </TabsList>
          
          <TabsContent value="liveatc">
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2">
                {LIVEATC_PRESETS.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto py-2 px-3 justify-start text-left"
                    onClick={() => handleSelectPopularStream(preset)}
                  >
                    <span className="truncate text-sm">{preset.name}</span>
                  </Button>
                ))}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Popular LiveATC streams - click to select
              </div>
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                Note: For LiveATC streams, always use direct .pls file URLs (e.g., https://www.liveatc.net/play/katl_twr.pls)
                rather than web player URLs.
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="youtube">
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2">
                {YOUTUBE_PRESETS.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto py-2 px-3 justify-start text-left"
                    onClick={() => handleSelectPopularStream(preset)}
                  >
                    <span className="truncate text-sm">{preset.name}</span>
                  </Button>
                ))}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Popular YouTube audio streams - click to select
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a name for this stream" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={
                        activeTab === 'liveatc'
                          ? "LiveATC URL (e.g., https://www.liveatc.net/play/kord_twr.pls)"
                          : "YouTube URL (e.g., https://youtube.com/watch?v=...)"
                      } 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : (
                  <>
                    <FaPlus className="mr-2 h-4 w-4" /> Add Stream
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}