import { useState, useEffect } from 'react';

export function isMobileDevice(): boolean {
  return window.innerWidth < 768;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileDevice());

  useEffect(() => {
    const handler = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
}
