import { useState, useCallback } from 'react';

const STORAGE_KEY = 'atc_compact_mode';

function readCompactMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useCompactMode() {
  const [isCompact, setIsCompact] = useState<boolean>(readCompactMode);

  const toggleCompact = useCallback(() => {
    setIsCompact(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { isCompact, toggleCompact };
}
