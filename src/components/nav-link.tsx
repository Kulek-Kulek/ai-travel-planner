'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
  matchNestedPaths?: boolean; // If true, will match /path and /path/*
}

export function NavLink({ 
  href, 
  children, 
  className, 
  activeClassName,
  onClick,
  matchNestedPaths = true 
}: NavLinkProps) {
  const pathname = usePathname();
  
  // Check if the current path is active
  const isActive = matchNestedPaths 
    ? pathname === href || pathname.startsWith(`${href}/`)
    : pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        className,
        isActive && activeClassName
      )}
    >
      {children}
    </Link>
  );
}



