import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from 'lucide-react';

const POLL_INTERVAL = 60 * 1000; // Check every 60 seconds

export function ServiceWorkerUpdate() {
  const knownVersion = useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function checkVersion() {
      try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const { version } = await res.json();

        if (knownVersion.current === null) {
          // First check — store the baseline
          knownVersion.current = version;
          return;
        }

        if (version !== knownVersion.current) {
          setUpdateAvailable(true);
          toast({
            title: "Update Available",
            description: "A new version is available. Click to reload.",
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Reload
              </Button>
            ),
          });
          // Stop polling once we've detected an update
          clearInterval(timer);
        }
      } catch {
        // Network error — skip this check
      }
    }

    checkVersion();
    timer = setInterval(checkVersion, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 shadow-lg"
      >
        <RefreshCw size={16} />
        Update Available — Reload
      </Button>
    </div>
  );
}
