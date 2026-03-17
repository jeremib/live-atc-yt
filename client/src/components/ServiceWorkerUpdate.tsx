import { useEffect, useState } from 'react';
import { Workbox } from 'workbox-window';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerUpdate() {
  const [wb, setWb] = useState<Workbox | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const workbox = new Workbox('/sw.js');

      // Add listeners for service worker updates
      workbox.addEventListener('waiting', () => {
        setUpdateAvailable(true);
        toast({
          title: "Update Available",
          description: "A new version is available. Click to update.",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleUpdate()}
              className="flex items-center gap-1"
            >
              <RefreshCw size={14} />
              Update
            </Button>
          )
        });
      });

      workbox.register();
      setWb(workbox);
    }
  }, [toast]);

  const handleUpdate = () => {
    if (!wb) return;
    
    // Send the SKIP_WAITING message to the service worker
    wb.messageSkipWaiting();
    
    // Once the service worker is activated, refresh the page
    wb.addEventListener('controlling', () => {
      window.location.reload();
    });
  };

  if (!updateAvailable) return null;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleUpdate}
      className="flex items-center gap-2"
    >
      <RefreshCw size={16} />
      Update App
    </Button>
  );
}