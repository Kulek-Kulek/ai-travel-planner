'use client';

import { useEffect } from 'react';

/**
 * Client component that scrolls to top when mounted
 * Useful for pages where you want to ensure users start at the top
 */
export function ScrollToTop() {
  useEffect(() => {
    // Scroll to top immediately when component mounts
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return null;
}
