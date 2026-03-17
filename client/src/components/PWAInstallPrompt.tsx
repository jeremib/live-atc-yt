import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed (display mode is standalone or fullscreen)
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Save the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast({
        title: "App Installed",
        description: "AudioStream Hub has been installed on your device!"
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    // Show the install prompt
    await installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      toast({
        title: "Installing...",
        description: "AudioStream Hub is being installed on your device"
      });
    } else {
      toast({
        title: "Installation declined",
        description: "You can install the app later from the menu"
      });
    }

    // Clear the saved prompt as it can't be used again
    setInstallPrompt(null);
  };

  // Don't show anything if the app is already installed or if there's no install prompt
  if (isInstalled || !installPrompt) return null;

  return (
    <Button 
      className="flex items-center gap-2" 
      variant="outline" 
      onClick={handleInstallClick}
    >
      <Download size={16} />
      Install App
    </Button>
  );
}