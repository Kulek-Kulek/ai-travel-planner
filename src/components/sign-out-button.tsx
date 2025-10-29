"use client";

import { Button } from '@/components/ui/button';
import { clientSignOut } from '@/lib/auth/client-auth';
import { useState } from 'react';
import { toast } from 'sonner';

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await clientSignOut();
    } catch {
      setIsSigningOut(false);
      toast.error('Failed to sign out', {
        description: 'Please try again',
      });
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Signing out...' : 'Sign Out'}
    </Button>
  );
}

