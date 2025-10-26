'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { shareItinerary } from '@/lib/utils/share';

interface ItineraryShareButtonProps {
  itineraryId: string;
  title: string;
  description?: string;
}

export function ItineraryShareButton({ 
  itineraryId, 
  title, 
  description 
}: ItineraryShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);

    try {
      const result = await shareItinerary({
        id: itineraryId,
        title,
        description: description || `Check out this amazing ${title} travel itinerary!`,
      });

      if (result.success) {
        if (result.method === 'native') {
          // Native share was successful (don't show toast, as native dialog handled it)
        } else if (result.method === 'clipboard') {
          toast.success('Link copied to clipboard! 📋');
        }
      } else {
        toast.error('Failed to share. Please try again.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Something went wrong');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      variant="outline"
      size="lg"
      className="gap-2"
    >
      <Share2 className="w-5 h-5" />
      Share
    </Button>
  );
}

