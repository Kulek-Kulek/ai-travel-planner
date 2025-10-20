'use client';

import { useEffect, useRef, useState } from 'react';

type HideOnScrollProps = {
  children: React.ReactNode;
  height?: number; // header height in px (for internal measurements only)
};

export function HideOnScroll({ children, height = 64 }: HideOnScrollProps) {
  const lastScrollY = useRef(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      const scrolledEnough = Math.abs(delta) > 5;

      if (scrolledEnough) {
        if (delta > 0 && currentY > height) {
          setHidden(true); // scrolling down
        } else {
          setHidden(false); // scrolling up
        }
        lastScrollY.current = currentY;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [height]);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 transform-gpu transition-transform duration-300 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
      style={{ height }}
    >
      {children}
    </div>
  );
}


