'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface ManageSubscriptionButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showIcon?: boolean;
}

/**
 * Button to open Stripe Customer Portal
 * Allows users to manage their subscription, update payment method, view invoices, etc.
 */
export function ManageSubscriptionButton({
  variant = 'outline',
  size = 'default',
  className,
  showIcon = true,
}: ManageSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open customer portal');
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Customer portal error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to open customer portal'
      );
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          {showIcon && <Settings className="mr-2 h-4 w-4" />}
          Manage Subscription
        </>
      )}
    </Button>
  );
}

