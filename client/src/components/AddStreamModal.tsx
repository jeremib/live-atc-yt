import { useState, useEffect } from 'react';
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

interface ScannerFeed {
  id: string;
  name: string;
  city: string;
  state: string;
  county: string;
  category: 'police' | 'fire' | 'ems' | 'multi';
  url: string;
  tags: string[];
}

interface NoaaFeed {
  id: string;
  name: string;
  callsign: string;
  city: string;
  state: string;
  frequency: string;
  url: string;
}

interface RailroadFeed {
  id: string;
  name: string;
  railroad: string;
  location: string;
  state: string;
  url: string;
}

interface SomaFmFeed {
  id: string;
  name: string;
  description: string;
  genre: string;
  url: string;
  listeners?: number;
}

type TabType = 'liveatc' | 'scanner' | 'noaa' | 'railroad' | 'somafm' | 'youtube';

interface AddStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AirportInfo {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

interface FeedResult {
  name: string;
  url: string;
  label: string;
}

interface FeedSearchResponse {
  feeds: FeedResult[];
  airport: AirportInfo | null;
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
  const [activeTab, setActiveTab] = useState<TabType>('liveatc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FeedResult[]>([]);
  const [searchAirport, setSearchAirport] = useState<AirportInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [ytSearchResults, setYtSearchResults] = useState<YouTubeResult[]>([]);
  const [isYtSearching, setIsYtSearching] = useState(false);
  const [scannerQuery, setScannerQuery] = useState('');
  const [scannerResults, setScannerResults] = useState<ScannerFeed[]>([]);
  const [scannerCategory, setScannerCategory] = useState<string>('');
  const [isScannerSearching, setIsScannerSearching] = useState(false);

  // NOAA state
  const [noaaQuery, setNoaaQuery] = useState('');
  const [noaaResults, setNoaaResults] = useState<NoaaFeed[]>([]);
  const [isNoaaSearching, setIsNoaaSearching] = useState(false);

  // Railroad state
  const [railroadQuery, setRailroadQuery] = useState('');
  const [railroadResults, setRailroadResults] = useState<RailroadFeed[]>([]);
  const [isRailroadSearching, setIsRailroadSearching] = useState(false);

  // SomaFM state
  const [somafmFilter, setSomafmFilter] = useState('');
  const [somafmFeeds, setSomafmFeeds] = useState<SomaFmFeed[]>([]);
  const [isSomafmLoading, setIsSomafmLoading] = useState(false);

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
      return url.includes('liveatc.net') || url.endsWith('.pls');
    } else if (type === 'youtube') {
      return (
        (url.includes('youtube.com') || url.includes('youtu.be')) &&
        !!extractYouTubeID(url)
      );
    }
    return false;
  };

  // Load SomaFM feeds when tab is selected
  useEffect(() => {
    if (activeTab === 'somafm' && somafmFeeds.length === 0 && !isSomafmLoading) {
      loadSomafmFeeds();
    }
  }, [activeTab]);

  const loadSomafmFeeds = async () => {
    setIsSomafmLoading(true);
    try {
      const resp = await fetch('/api/somafm');
      if (!resp.ok) throw new Error('Failed to fetch');
      const feeds: SomaFmFeed[] = await resp.json();
      setSomafmFeeds(feeds);
    } catch {
      toast({
        title: 'Error',
        description: 'Could not load SomaFM stations.',
        variant: 'destructive',
      });
    } finally {
      setIsSomafmLoading(false);
    }
  };

  // Filtered SomaFM feeds
  const filteredSomafmFeeds = somafmFilter.trim()
    ? somafmFeeds.filter((f) => {
        const q = somafmFilter.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.genre.toLowerCase().includes(q)
        );
      })
    : somafmFeeds;

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

  // Search scanner feeds
  const handleScannerSearch = async (queryOverride?: string, categoryOverride?: string) => {
    const q = queryOverride ?? scannerQuery.trim();
    const cat = categoryOverride ?? scannerCategory;
    setIsScannerSearching(true);
    setScannerResults([]);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      const resp = await fetch(`/api/scanner/search?${params.toString()}`);
      if (!resp.ok) throw new Error('Search failed');
      const feeds: ScannerFeed[] = await resp.json();
      setScannerResults(feeds);
      if (feeds.length === 0 && q) {
        toast({ title: 'No results', description: `No scanner feeds found for "${q}"` });
      }
    } catch {
      toast({
        title: 'Search error',
        description: 'Could not search scanner feeds. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsScannerSearching(false);
    }
  };

  // Search NOAA feeds
  const handleNoaaSearch = async () => {
    const q = noaaQuery.trim();
    setIsNoaaSearching(true);
    setNoaaResults([]);
    try {
      const resp = await fetch(`/api/noaa/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error('Search failed');
      const feeds: NoaaFeed[] = await resp.json();
      setNoaaResults(feeds);
      if (feeds.length === 0 && q) {
        toast({ title: 'No results', description: `No NOAA feeds found for "${q}"` });
      }
    } catch {
      toast({
        title: 'Search error',
        description: 'Could not search NOAA feeds. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsNoaaSearching(false);
    }
  };

  // Search railroad feeds
  const handleRailroadSearch = async () => {
    const q = railroadQuery.trim();
    setIsRailroadSearching(true);
    setRailroadResults([]);
    try {
      const resp = await fetch(`/api/railroad/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error('Search failed');
      const feeds: RailroadFeed[] = await resp.json();
      setRailroadResults(feeds);
      if (feeds.length === 0 && q) {
        toast({ title: 'No results', description: `No railroad feeds found for "${q}"` });
      }
    } catch {
      toast({
        title: 'Search error',
        description: 'Could not search railroad feeds. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRailroadSearching(false);
    }
  };

  // Handle form submission
  const onSubmit = async (formData: AddStreamFormData) => {
    setIsLoading(true);

    try {
      if (!validateURL(formData.url, activeTab as StreamType)) {
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
      const stream = await addStream(formData.name, formData.url, activeTab as StreamType);

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
  const handleQuickAdd = async (name: string, url: string, type: StreamType) => {
    setIsLoading(true);
    try {
      const stream = await addStream(name, url, type);
      if (stream) {
        toast({ title: 'Stream Added', description: `${name} has been added successfully` });
        form.reset();
        setSearchResults([]);
        setYtSearchResults([]);
        setScannerResults([]);
        setNoaaResults([]);
        setRailroadResults([]);
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
    setSearchAirport(null);
    try {
      const resp = await fetch(`/api/liveatc/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) throw new Error('Search failed');
      const data: FeedSearchResponse = await resp.json();
      setSearchResults(data.feeds);
      setSearchAirport(data.airport);
      if (data.feeds.length === 0) {
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
          onValueChange={(value) => setActiveTab(value as TabType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
            <TabsTrigger value="liveatc" className="text-xs">LiveATC</TabsTrigger>
            <TabsTrigger value="scanner" className="text-xs">Scanner</TabsTrigger>
            <TabsTrigger value="noaa" className="text-xs">NOAA</TabsTrigger>
            <TabsTrigger value="railroad" className="text-xs">Railroad</TabsTrigger>
            <TabsTrigger value="somafm" className="text-xs">SomaFM</TabsTrigger>
            <TabsTrigger value="youtube" className="text-xs">YouTube</TabsTrigger>
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
                  {searchAirport && (
                    <div className="mb-2 px-3 py-2 bg-neutral-50 rounded-md border border-neutral-200">
                      <div className="font-semibold text-sm text-neutral-800">
                        {searchAirport.icao} — {searchAirport.name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {searchAirport.city}, {searchAirport.country} · {searchAirport.iata} · {searchAirport.timezone}
                      </div>
                    </div>
                  )}
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
          <TabsContent value="scanner">
            <div className="space-y-4 pt-4">
              {/* Scanner search */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Search by city, state, or name</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. New York, Chicago, LAPD..."
                    value={scannerQuery}
                    onChange={(e) => setScannerQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleScannerSearch())}
                  />
                  <Button
                    type="button"
                    onClick={() => handleScannerSearch()}
                    disabled={isScannerSearching}
                  >
                    {isScannerSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {/* Category filter buttons */}
              <div className="flex gap-1.5">
                {[
                  { value: '', label: 'All' },
                  { value: 'police', label: 'Police' },
                  { value: 'fire', label: 'Fire' },
                  { value: 'ems', label: 'EMS' },
                ].map((cat) => (
                  <Button
                    key={cat.value}
                    type="button"
                    variant={scannerCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setScannerCategory(cat.value);
                      handleScannerSearch(undefined, cat.value);
                    }}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Scanner results */}
              {scannerResults.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {scannerResults.length} feed{scannerResults.length !== 1 ? 's' : ''} found — click to add
                  </div>
                  <div className="space-y-1.5">
                    {scannerResults.map((feed) => {
                      const categoryColors: Record<string, string> = {
                        police: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        fire: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        ems: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        multi: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                      };
                      return (
                        <Button
                          key={feed.id}
                          variant="outline"
                          className="w-full h-auto py-2 px-3 justify-start text-left"
                          disabled={isLoading}
                          onClick={() => handleQuickAdd(feed.name, feed.url, 'scanner')}
                        >
                          <div className="flex items-center gap-2 min-w-0 w-full">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${categoryColors[feed.category]}`}>
                              {feed.category.toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm truncate">{feed.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {feed.city}, {feed.state} — {feed.county} County
                              </div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="noaa">
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Search by city, state, or callsign</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Chicago, TX, WXK46..."
                    value={noaaQuery}
                    onChange={(e) => setNoaaQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleNoaaSearch())}
                  />
                  <Button
                    type="button"
                    onClick={handleNoaaSearch}
                    disabled={isNoaaSearching}
                  >
                    {isNoaaSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {noaaResults.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {noaaResults.length} station{noaaResults.length !== 1 ? 's' : ''} found — click to add
                  </div>
                  <div className="space-y-1.5">
                    {noaaResults.map((feed) => (
                      <Button
                        key={feed.id}
                        variant="outline"
                        className="w-full h-auto py-2 px-3 justify-start text-left"
                        disabled={isLoading}
                        onClick={() => handleQuickAdd(feed.name, feed.url, 'noaa')}
                      >
                        <div className="flex items-center gap-2 min-w-0 w-full">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            NOAA
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm truncate">{feed.callsign} — {feed.city}, {feed.state}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {feed.frequency}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="railroad">
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Search by railroad or location</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. BNSF, Union Pacific, Cheyenne..."
                    value={railroadQuery}
                    onChange={(e) => setRailroadQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRailroadSearch())}
                  />
                  <Button
                    type="button"
                    onClick={handleRailroadSearch}
                    disabled={isRailroadSearching}
                  >
                    {isRailroadSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {railroadResults.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {railroadResults.length} feed{railroadResults.length !== 1 ? 's' : ''} found — click to add
                  </div>
                  <div className="space-y-1.5">
                    {railroadResults.map((feed) => (
                      <Button
                        key={feed.id}
                        variant="outline"
                        className="w-full h-auto py-2 px-3 justify-start text-left"
                        disabled={isLoading}
                        onClick={() => handleQuickAdd(feed.name, feed.url, 'railroad')}
                      >
                        <div className="flex items-center gap-2 min-w-0 w-full">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {feed.railroad.toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm truncate">{feed.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {feed.location}, {feed.state}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="somafm">
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Filter stations</label>
                <Input
                  placeholder="Filter by name, genre, description..."
                  value={somafmFilter}
                  onChange={(e) => setSomafmFilter(e.target.value)}
                />
              </div>

              {isSomafmLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">Loading stations...</div>
              ) : (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {filteredSomafmFeeds.length} station{filteredSomafmFeeds.length !== 1 ? 's' : ''} — click to add
                  </div>
                  <div className="space-y-1.5">
                    {filteredSomafmFeeds.map((feed) => (
                      <Button
                        key={feed.id}
                        variant="outline"
                        className="w-full h-auto py-2 px-3 justify-start text-left"
                        disabled={isLoading}
                        onClick={() => handleQuickAdd(feed.name, feed.url, 'somafm')}
                      >
                        <div className="flex items-center gap-2 min-w-0 w-full">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {feed.genre}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm truncate">{feed.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {feed.description}
                            </div>
                          </div>
                        </div>
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
