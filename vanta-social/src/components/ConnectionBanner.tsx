import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Online/offline status only; does not claim that Supabase itself is reachable. */
export function ConnectionBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" aria-live="polite" className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-300/20 bg-amber-950/95 px-4 py-2 text-center text-xs font-medium text-amber-100">
      <WifiOff aria-hidden="true" className="h-4 w-4" /> Sin conexión a internet. Algunas funciones no estarán disponibles.
    </div>
  );
}
