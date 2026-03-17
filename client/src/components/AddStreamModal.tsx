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

interface FeedResult {
  name: string;
  url: string;
  label: string;
}

interface YouTubeResult {
  name: string;
  url: string;
  thumbnail: string;
  duration: string;
  author: string;
}

export function AddStreamModal({ isOpen, onClose }: AddStreamModalProps) {
  const { addStream } = useStreams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'liveatc' | 'youtube'>('liveatc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FeedResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [ytSearchResults, setYtSearchResults] = useState<YouTubeResult[]>([]);
  const [isYtSearching, setIsYtSearching] = useState(false);
  
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
  
  // Search YouTube videos
  const handleYtSearch = async () => {
    const q = ytSearchQuery.trim();
    if (!q) {
      toast({
        title: 'Enter a search term',
        description: 'Type something to search YouTube',
        variant: 'destructive',
      });
      return;
    }
    setIsYtSearching(true);
    setYtSearchResults([]);
    try {
      const resp = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error('Search failed');
      const videos: YouTubeResult[] = await resp.json();
      setYtSearchResults(videos);
      if (videos.length === 0) {
        toast({ title: 'No results', description: `No YouTube videos found for "${q}"` });
      }
    } catch {
      toast({
        title: 'Search error',
        description: 'Could not search YouTube. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsYtSearching(false);
    }
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

  // Directly add a stream from search results
  const handleQuickAdd = async (name: string, url: string, type: 'liveatc' | 'youtube') => {
    setIsLoading(true);
    try {
      const stream = await addStream(name, url, type);
      if (stream) {
        toast({ title: 'Stream Added', description: `${name} has been added successfully` });
        form.reset();
        setSearchResults([]);
        setYtSearchResults([]);
        onClose();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add stream', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Search LiveATC feeds by ICAO code
  const handleSearch = async () => {
    const q = searchQuery.trim().toUpperCase();
    if (q.length < 3 || q.length > 4) {
      toast({
        title: 'Invalid code',
        description: 'Enter a 3-4 letter airport code (e.g. KATL, TYS, JFK)',
        variant: 'destructive',
      });
      return;
    }
    setIsSearching(true);
    setSearchResults([]);
    try {
      const resp = await fetch(`/api/liveatc/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error('Search failed');
      const feeds: FeedResult[] = await resp.json();
      setSearchResults(feeds);
      if (feeds.length === 0) {
        toast({
          title: 'No feeds found',
          description: `No LiveATC feeds found for ${q}`,
        });
      }
    } catch {
      toast({
        title: 'Search error',
        description: 'Could not search LiveATC feeds. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Stream</DialogTitle>
          <DialogDescription>
            Add a new audio stream to listen to simultaneously with others
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
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
              {/* Airport search */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Search by airport code</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Airport code (e.g. KATL, TYS, JFK)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                    maxLength={4}
                    className="font-mono uppercase"
                  />
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {/* Search results — click to add directly */}
              {searchResults.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {searchResults.length} feed{searchResults.length !== 1 ? 's' : ''} found — click to add
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.map((feed, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-2 px-3 justify-start text-left"
                        disabled={isLoading}
                        onClick={() => handleQuickAdd(feed.name, feed.url, 'liveatc')}
                      >
                        <span className="truncate text-sm">{feed.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick presets — hidden when search results are showing */}
              {searchResults.length === 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    Popular streams — click to add
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {LIVEATC_PRESETS.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-2 px-3 justify-start text-left"
                        disabled={isLoading}
                        onClick={() => handleQuickAdd(preset.name, preset.url, 'liveatc')}
                      >
                        <span className="truncate text-sm">{preset.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="youtube">
            <div className="space-y-4 pt-4">
              {/* YouTube search */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Search YouTube</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for videos or live streams..."
                    value={ytSearchQuery}
                    onChange={(e) => setYtSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleYtSearch())}
                  />
                  <Button
                    type="button"
                    onClick={handleYtSearch}
                    disabled={isYtSearching}
                  >
                    {isYtSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {/* YouTube search results — click to add directly */}
              {ytSearchResults.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {ytSearchResults.length} result{ytSearchResults.length !== 1 ? 's' : ''} — click to add
                  </div>
                  <div className="space-y-1.5">
                    {ytSearchResults.map((video, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full h-auto py-2 px-3 justify-start text-left"
                        disabled={isLoading}
                        onClick={() => handleQuickAdd(video.name, video.url, 'youtube')}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={video.thumbnail}
                            alt=""
                            className="w-16 h-9 rounded object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-sm truncate">{video.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {video.author} · {video.duration}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick presets — hidden when search results are showing */}
              {ytSearchResults.length === 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    Popular streams — click to add
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {YOUTUBE_PRESETS.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-2 px-3 justify-start text-left"
                        disabled={isLoading}
                        onClick={() => handleQuickAdd(preset.name, preset.url, 'youtube')}
                      >
                        <span className="truncate text-sm">{preset.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Or add manually by URL
          </summary>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-3">
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
                            ? "https://www.liveatc.net/play/kord_twr.pls"
                            : "https://youtube.com/watch?v=..."
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Adding...' : (
                  <><FaPlus className="mr-2 h-4 w-4" /> Add Stream</>
                )}
              </Button>
            </form>
          </Form>
        </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}