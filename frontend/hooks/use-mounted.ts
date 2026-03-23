import { useState, useEffect } from 'react';

/**
 * Hook for detecting client-side mounting
 * Useful for preventing hydration mismatches
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
