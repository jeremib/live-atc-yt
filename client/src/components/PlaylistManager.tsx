import { useState, useEffect } from 'react';
import { FaTrash, FaPlay, FaSave } from 'react-icons/fa';
import { useStreams } from '@/contexts/StreamContext';
import { useToast } from '@/hooks/use-toast';
import { Playlist, PlaylistStream } from '@/lib/types';
import { savePlaylists, loadPlaylists } from '@/lib/localStorage';

interface PlaylistManagerProps {
  onClose: () => void;
}

export function PlaylistManager({ onClose }: PlaylistManagerProps) {
  const { streams, addStream } = useStreams();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPlaylists(loadPlaylists());
  }, []);

  const handleSave = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (streams.length === 0) {
      toast({
        title: 'No Streams',
        description: 'Add some streams before saving a playlist.',
        variant: 'destructive',
      });
      return;
    }

    const playlistStreams: PlaylistStream[] = streams.map((s) => ({
      name: s.name,
      url: s.url,
      type: s.type,
    }));

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: trimmed,
      streams: playlistStreams,
      createdAt: new Date().toISOString(),
    };

    const updated = [newPlaylist, ...playlists];
    setPlaylists(updated);
    savePlaylists(updated);
    setNewName('');

    toast({
      title: 'Playlist Saved',
      description: `"${trimmed}" saved with ${playlistStreams.length} stream${playlistStreams.length !== 1 ? 's' : ''}.`,
    });
  };

  const handleDelete = (id: string) => {
    const updated = playlists.filter((p) => p.id !== id);
    setPlaylists(updated);
    savePlaylists(updated);
  };

  const handleLoad = async (playlist: Playlist) => {
    setIsLoading(true);
    const existingUrls = new Set(streams.map((s) => s.url));
    let added = 0;

    for (const ps of playlist.streams) {
      if (existingUrls.has(ps.url)) continue;
      await addStream(ps.name, ps.url, ps.type);
      added++;
    }

    setIsLoading(false);

    toast({
      title: 'Playlist Loaded',
      description:
        added > 0
          ? `Added ${added} stream${added !== 1 ? 's' : ''} from "${playlist.name}".`
          : `All streams from "${playlist.name}" are already active.`,
    });

    onClose();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 p-3 z-[100] text-sm text-neutral-700 dark:text-neutral-200" onClick={(e) => e.stopPropagation()}>
      <h4 className="font-semibold mb-2 text-neutral-800 dark:text-neutral-100">
        Playlists
      </h4>

      {/* Save current streams */}
      <div className="flex gap-1.5 mb-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Playlist name..."
          className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSave}
          disabled={!newName.trim() || streams.length === 0}
          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md flex items-center gap-1 text-xs font-medium transition"
          title="Save current streams as playlist"
        >
          <FaSave className="text-[10px]" />
          Save
        </button>
      </div>

      {/* Playlist list */}
      {playlists.length === 0 ? (
        <p className="text-neutral-400 dark:text-neutral-500 text-xs text-center py-2">
          No saved playlists yet.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-60 overflow-y-auto">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-1.5 p-2 rounded-md bg-neutral-50 dark:bg-neutral-700/50"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-neutral-400 dark:text-neutral-500">
                  {p.streams.length} stream{p.streams.length !== 1 ? 's' : ''} &middot;{' '}
                  {formatDate(p.createdAt)}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleLoad(p)}
                  disabled={isLoading}
                  className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition disabled:opacity-40"
                  title="Load playlist"
                >
                  <FaPlay className="text-xs" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition"
                  title="Delete playlist"
                >
                  <FaTrash className="text-xs" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
