'use client';

import { useState } from 'react';
import { likeItinerary } from '@/lib/actions/itinerary-actions';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { ThumbsUp, Share2, Heart } from 'lucide-react';

interface ItineraryLikeButtonProps {
  itineraryId: string;
  initialLikes: number;
}

export function ItineraryLikeButton({ itineraryId, initialLikes }: ItineraryLikeButtonProps) {
  const [currentLikes, setCurrentLikes] = useState(initialLikes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(() => {
    // Check localStorage to see if user has already liked this itinerary
    if (typeof window !== 'undefined') {
      const liked = localStorage.getItem(`liked_${itineraryId}`);
      return liked === 'true';
    }
    return false;
  });
  const [justLiked, setJustLiked] = useState(false);

  const handleLike = async () => {
    if (hasLiked) {
      toast.info('You already liked this itinerary!');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    setJustLiked(true);
    
    // Remove animation after it completes (500ms)
    setTimeout(() => setJustLiked(false), 500);

    // Optimistic update
    setCurrentLikes(prev => prev + 1);
    setHasLiked(true);

    try {
      const result = await likeItinerary(itineraryId);

      if (result.success) {
        // Update with actual value from server
        setCurrentLikes(result.data);
        // Save to localStorage
        localStorage.setItem(`liked_${itineraryId}`, 'true');
        toast.success('Thanks for your thumbs up! 👍');
      } else {
        // Revert optimistic update
        setCurrentLikes(prev => prev - 1);
        setHasLiked(false);
        toast.error('Failed to like itinerary');
      }
    } catch (error) {
      // Revert optimistic update
      setCurrentLikes(prev => prev - 1);
      setHasLiked(false);
      toast.error('Something went wrong');
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Like button */}
      <Button
        onClick={handleLike}
        disabled={isLiking || hasLiked}
        variant={hasLiked ? 'default' : 'outline'}
        size="lg"
        className={`flex items-center gap-2 ${
          hasLiked
            ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-default'
            : 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600'
        } ${isLiking ? 'opacity-50' : ''} transition-all active:scale-95`}
        title={hasLiked ? 'You liked this!' : 'Give this itinerary a thumbs up'}
      >
        <span className="font-semibold">{currentLikes}</span>
        <ThumbsUp className={`w-5 h-5 ${justLiked ? 'animate-bounce' : ''}`} />
      </Button>
      
      {/* Share button - placeholder */}
      <Button
        onClick={() => toast.info('Share feature coming soon!')}
        variant="outline"
        size="lg"
        className="hover:bg-green-50 hover:text-green-600 hover:border-green-600 transition-all active:scale-95"
        title="Share with friends (coming soon)"
      >
        <Share2 className="w-5 h-5" />
      </Button>
      
      {/* Bucket list button - placeholder */}
      <Button
        onClick={() => toast.info('Bucket list feature coming soon!')}
        variant="outline"
        size="lg"
        className="hover:bg-red-50 hover:text-red-600 hover:border-red-600 transition-all active:scale-95"
        title="Add to bucket list (coming soon)"
      >
        <Heart className="w-5 h-5" />
      </Button>
    </div>
  );
}

