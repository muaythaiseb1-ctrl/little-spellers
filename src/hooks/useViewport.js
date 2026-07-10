import { useState, useEffect } from 'react';

export function useViewport() {
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1200; // default fallback
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width <= 1024;
  const isDesktop = width > 1024;

  return {
    width,
    isMobile,
    isTablet,
    isDesktop
  };
}
