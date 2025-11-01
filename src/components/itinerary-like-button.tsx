'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { likeItinerary, addToBucketList, removeFromBucketList, isInBucketList } from '@/lib/actions/itinerary-actions';
import { Button } from './ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ThumbsUp, Heart } from 'lucide-react';

interface ItineraryLikeButtonProps {
  itineraryId: string;
  initialLikes: number;
}

export function ItineraryLikeButton({ itineraryId, initialLikes }: ItineraryLikeButtonProps) {
  const router = useRouter();
  const justLikedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentLikes, setCurrentLikes] = useState(initialLikes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(false); // Start with false to avoid hydration mismatch
  const [justLiked, setJustLiked] = useState(false);
  const [inBucketList, setInBucketList] = useState(false);
  const [isCheckingBucketList, setIsCheckingBucketList] = useState(true);
  const [isAddingToBucket, setIsAddingToBucket] = useState(false);
  
  // Check localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const liked = localStorage.getItem(`liked_${itineraryId}`);
    setHasLiked(liked === 'true');
  }, [itineraryId]);
  
  // Check if itinerary is in bucket list on mount
  useEffect(() => {
    async function checkBucketListStatus() {
      setIsCheckingBucketList(true);
      const result = await isInBucketList(itineraryId);
      if (result.success) {
        setInBucketList(result.data);
      }
      setIsCheckingBucketList(false);
    }
    
    checkBucketListStatus();
  }, [itineraryId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (justLikedTimeoutRef.current) {
        clearTimeout(justLikedTimeoutRef.current);
      }
    };
  }, []);

  const handleLike = async () => {
    if (hasLiked) {
      toast.info('You already liked this itinerary!');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
    setJustLiked(true);
    
    // Remove animation after it completes (500ms)
    if (justLikedTimeoutRef.current) {
      clearTimeout(justLikedTimeoutRef.current);
    }
    justLikedTimeoutRef.current = setTimeout(() => setJustLiked(false), 500);

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
    } catch {
      // Revert optimistic update
      setCurrentLikes(prev => prev - 1);
      setHasLiked(false);
      toast.error('Something went wrong');
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleAddToBucketList = async () => {
    if (isAddingToBucket) return;
    
    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated - store intent and redirect to sign-in
      sessionStorage.setItem('pendingBucketListAdd', itineraryId);
      toast.info('Please sign in to save to your bucket list');
      router.push(`/sign-in?redirectTo=/itinerary/${itineraryId}`);
      return;
    }
    
    setIsAddingToBucket(true);
    
    try {
      const result = await addToBucketList(itineraryId);
      
      if (result.success) {
        setInBucketList(true);
        toast.success('Added to your bucket list! ❤️');
      } else {
        if (result.error === 'Already in your bucket list') {
          setInBucketList(true);
          toast.info('This itinerary is already in your bucket list!');
        } else {
          toast.error(result.error || 'Failed to add to bucket list');
        }
      }
    } catch (error) {
      console.error('Error adding to bucket list:', error);
      toast.error('Something went wrong');
    } finally {
      setIsAddingToBucket(false);
    }
  };
  
  const handleRemoveFromBucketList = async () => {
    try {
      const result = await removeFromBucketList(itineraryId);
      
      if (result.success) {
        setInBucketList(false);
        toast.success('Removed from bucket list');
      } else {
        toast.error(result.error || 'Failed to remove from bucket list');
      }
    } catch (error) {
      console.error('Error removing from bucket list:', error);
      toast.error('Something went wrong');
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
      
      {/* Bucket list button */}
      <Button
        onClick={inBucketList ? handleRemoveFromBucketList : handleAddToBucketList}
        disabled={isAddingToBucket || isCheckingBucketList}
        variant={inBucketList ? 'default' : 'outline'}
        size="lg"
        className={`flex items-center gap-2 ${
          inBucketList
            ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-default'
            : 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600'
        } ${(isAddingToBucket || isCheckingBucketList) ? 'opacity-50' : ''} transition-all active:scale-95`}
        title={inBucketList ? 'Remove from bucket list' : 'Add to bucket list'}
      >
        <Heart className={`w-5 h-5 ${inBucketList ? 'fill-current' : ''}`} />
      </Button>
    </div>
  );
}

