import { useState, useEffect } from 'react';

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => isMobileDevice());

  useEffect(() => {
    // 立即同步一次，防止首屏初始值不准确
    setIsMobile(isMobileDevice());
    const handler = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
}

