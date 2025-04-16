import { useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { clearSavedData } from '@/lib/localStorage';
import { useToast } from '@/hooks/use-toast';

export function LocalStorageControls() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleClearSavedData = () => {
    clearSavedData();
    setIsOpen(false);
    
    toast({
      title: 'Data cleared',
      description: 'Your saved streams have been cleared. Refresh the page to start fresh.',
    });
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/90 hover:bg-white"
          >
            <FaTrash className="mr-2 h-3 w-3" />
            Clear saved streams
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear saved streams?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all your saved streams data from the browser storage.
              This action cannot be undone. You'll need to refresh the page to see
              the changes take effect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearSavedData}
              className="bg-red-500 hover:bg-red-600"
            >
              Clear data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}