'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface ConditionalLayoutProps {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  backToTop: ReactNode;
}

export function ConditionalLayout({ 
  children, 
  header, 
  footer, 
  backToTop 
}: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Hide header and footer on auth pages
  const isAuthPage = pathname.startsWith('/sign-in') || 
                     pathname.startsWith('/sign-up') || 
                     pathname.startsWith('/choose-plan') ||
                     pathname.startsWith('/confirm-email');
  
  return (
    <>
      {!isAuthPage && header}
      {children}
      {!isAuthPage && footer}
      {!isAuthPage && backToTop}
    </>
  );
}

