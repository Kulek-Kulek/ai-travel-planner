'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Fallback for older browsers
      window.scrollTo(0, 0);
    }
  };

  return (
    <div
      aria-hidden
      className={`fixed bottom-6 right-6 z-[90] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <Button
        onClick={scrollToTop}
        aria-label="Back to top"
        className="rounded-full shadow-lg h-11 w-11 p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
      >
        ↑
      </Button>
    </div>
  );
}


