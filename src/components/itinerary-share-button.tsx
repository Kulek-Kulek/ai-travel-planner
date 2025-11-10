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
  days?: number;
  places?: string[];
}

export function ItineraryShareButton({
  itineraryId,
  title,
  description,
  days,
  places
}: ItineraryShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);

    try {
      const generatedDescription =
        description ||
        (typeof days === 'number' && Array.isArray(places) && places.length > 0
          ? `A ${days}-day itinerary for ${title}. Highlights: ${places.slice(0, 3).join(', ')}`
          : `Check out this amazing ${title} travel itinerary!`);

      const result = await shareItinerary({
        id: itineraryId,
        title,
        description: generatedDescription,
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

