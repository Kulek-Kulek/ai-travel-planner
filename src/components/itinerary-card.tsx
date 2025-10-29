import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Itinerary } from '@/lib/actions/itinerary-actions';
import { likeItinerary, addToBucketList, removeFromBucketList, isInBucketList } from '@/lib/actions/itinerary-actions';
import { Button } from './ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import { shareItinerary } from '@/lib/utils/share';
import { generateBookingLink } from '@/lib/utils/booking-affiliate';
import { 
  Calendar,
  Users, 
  Accessibility, 
  Lock, 
  Globe, 
  CheckCircle2, 
  ThumbsUp, 
  Share2, 
  Heart, 
  Trash2, 
  Eye, 
  Pencil, 
  MoreVertical,
  RotateCcw,
  Hotel
} from 'lucide-react';

interface ItineraryCardProps {
  itinerary: Itinerary;
  showActions?: boolean;
  showBucketListActions?: boolean; // New prop for bucket list page
  isInBucketList?: boolean; // Optional: if provided, skip the bucket list check
  onTogglePrivacy?: (id: string, currentPrivacy: boolean) => void;
  onToggleStatus?: (id: string, currentStatus: string) => void;
  onDelete?: (id: string, destination: string) => void;
  onRemoveFromBucketList?: (id: string) => void; // New callback for removing from bucket list
}

export function ItineraryCard({ 
  itinerary, 
  showActions = false,
  showBucketListActions = false,
  isInBucketList: isInBucketListProp,
  onTogglePrivacy,
  onToggleStatus,
  onDelete,
  onRemoveFromBucketList
}: ItineraryCardProps) {
  const { 
    id, 
    destination, 
    days, 
    travelers, 
    start_date, 
    end_date, 
    children, 
    child_ages, 
    has_accessibility_needs,
    tags, 
    ai_plan, 
    created_at, 
    is_private, 
    status, 
    user_id,
    creator_name,
    image_url,
    likes
  } = itinerary;
  
  const router = useRouter();
  const [currentLikes, setCurrentLikes] = useState(likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(() => {
    // Check localStorage to see if user has already liked this itinerary
    if (typeof window !== 'undefined') {
      const liked = localStorage.getItem(`liked_${id}`);
      return liked === 'true';
    }
    return false;
  });
  const [justLiked, setJustLiked] = useState(false);
  const [inBucketList, setInBucketList] = useState(isInBucketListProp ?? false);
  const [isCheckingBucketList, setIsCheckingBucketList] = useState(isInBucketListProp === undefined);
  const [isAddingToBucket, setIsAddingToBucket] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Check if itinerary is in bucket list on mount - only if not provided via props
  useEffect(() => {
    // Skip check if already provided via props
    if (isInBucketListProp !== undefined) {
      setInBucketList(isInBucketListProp);
      setIsCheckingBucketList(false);
      return;
    }
    
    async function checkBucketListStatus() {
      setIsCheckingBucketList(true);
      const result = await isInBucketList(id);
      if (result.success) {
        setInBucketList(result.data);
      }
      setIsCheckingBucketList(false);
    }
    
    checkBucketListStatus();
  }, [id, isInBucketListProp]);
  
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
      const result = await likeItinerary(id);
      
      if (result.success) {
        // Update with actual value from server
        setCurrentLikes(result.data);
        // Save to localStorage
        localStorage.setItem(`liked_${id}`, 'true');
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
  
  const handleAddToBucketList = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAddingToBucket) return;
    
    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // User not authenticated - store intent and redirect to sign-in
      // Store the itinerary ID they want to add
      sessionStorage.setItem('pendingBucketListAdd', id);
      toast.info('Please sign in to save to your bucket list');
      // Redirect back to current page after login
      const currentPath = window.location.pathname;
      router.push(`/sign-in?redirectTo=${currentPath}`);
      return;
    }
    
    setIsAddingToBucket(true);
    
    try {
      const result = await addToBucketList(id);
      
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
  
  const handleRemoveFromBucketList = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If on bucket list page (showBucketListActions), just trigger the callback
    // The parent component will show a confirmation dialog
    if (showBucketListActions && onRemoveFromBucketList) {
      onRemoveFromBucketList(id);
      return;
    }
    
    // Otherwise, remove directly (for other pages)
    try {
      const result = await removeFromBucketList(id);
      
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
  
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    router.push(`/itinerary/${id}`);
  };
  
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSharing) return;
    
    setIsSharing(true);
    
    try {
      // Create a nice description
      const placesList = previewPlaces.slice(0, 3).join(', ');
      const description = placesList 
        ? `A ${days}-day itinerary for ${ai_plan.city || destination} including ${placesList} and more!`
        : `Check out this ${days}-day travel itinerary for ${ai_plan.city || destination}!`;
      
      const result = await shareItinerary({
        id,
        title: ai_plan.city || destination,
        description,
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
  
  const handleFindHotels = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const bookingUrl = generateBookingLink({
        destination: ai_plan.city || destination,
        checkIn: start_date ? new Date(start_date) : undefined,
        checkOut: end_date ? new Date(end_date) : undefined,
        adults: travelers,
        children: children || 0,
        childAges: child_ages || [],
      });
      
      window.open(bookingUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error generating booking link:', error);
      toast.error('Failed to open booking search');
    }
  };
  
  // Get first few places as preview
  const previewPlaces = ai_plan.days
    .slice(0, 2)
    .flatMap(day => day.places.slice(0, 2).map(place => place.name))
    .slice(0, 4);
  
  const cardContent = (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden h-full border border-gray-200 hover:border-blue-400 pointer-events-auto">
      {/* Image Header */}
      {image_url && (
        <div className="relative w-full h-48 bg-gray-200">
          <Image
            src={image_url}
            alt={`${ai_plan.city || destination} - Travel destination`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="p-5">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-xl font-bold text-gray-900">
            {ai_plan.city || destination}
          </h3>
          {/* Admin viewing indicator */}
          {showActions && !user_id && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium shrink-0">
              Anonymous
            </span>
          )}
        </div>
        <div className="space-y-1 mb-2">
          {/* Date range if available */}
          {start_date && end_date && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date(start_date).toLocaleDateString('en-GB')} - {new Date(end_date).toLocaleDateString('en-GB')}</span>
            </div>
          )}
          {!start_date && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{days} {days === 1 ? 'day' : 'days'}</span>
            </div>
          )}
          
          {/* Travelers info */}
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>
              {travelers} adult{travelers > 1 ? 's' : ''}
              {children && children > 0 ? (
                <>, {children} {children === 1 ? 'child' : 'children'} 
                {child_ages && child_ages.length > 0 && ` (ages: ${child_ages.join(', ')})`}</>
              ) : null}
            </span>
          </div>
          
          {/* Accessibility indicator */}
          {has_accessibility_needs && (
            <div className="flex items-center gap-1.5 text-sm text-blue-600">
              <Accessibility className="w-4 h-4" />
              <span>Accessible</span>
            </div>
          )}
        </div>
        
        {/* Privacy and Status badges (only when showActions is true) */}
        {showActions && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                is_private
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {is_private ? <><Lock className="w-3 h-3" /> Private</> : <><Globe className="w-3 h-3" /> Public</>}
            </span>
            {status === 'completed' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Preview places - always show */}
      <div className="mb-3 h-[60px]">
        <p className="text-sm text-gray-700 line-clamp-3">
          {previewPlaces.length > 0 
            ? `Includes: ${previewPlaces.join(', ')}${ai_plan.days.flatMap(d => d.places).length > 4 ? ', and more...' : ''}`
            : 'Click to view full itinerary'}
        </p>
      </div>
      
      {/* Tags - Fixed height for consistency */}
      <div className="mb-3 h-[52px]">
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 6).map((tag, idx) => (
              <span
                key={idx}
                className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200"
              >
                {tag}
              </span>
            ))}
            {tags.length > 6 && (
              <span className="inline-block text-blue-600 text-xs px-2 py-1">
                +{tags.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Footer - different for gallery vs my plans */}
      {!showActions ? (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          {/* Find Hotels CTA - PROMINENT! Always shown for maximum revenue */}
          <button
            onClick={handleFindHotels}
            className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-3 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2 text-white">
              <Hotel className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-sm">
                {start_date && end_date ? 'Find Hotels for This Trip' : `Find Hotels in ${ai_plan.city || destination}`}
              </span>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
          
          {/* Creator and date info */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-xs text-gray-500">
                {new Date(created_at).toLocaleDateString()}
              </span>
              {creator_name && (
                <span className="text-xs text-gray-600 truncate">
                  <span className="text-gray-400">by</span> <span className="font-medium text-indigo-600">{creator_name}</span>
                </span>
              )}
            </div>
            {showBucketListActions ? (
              <Link 
                href={`/itinerary/${id}`}
                className="text-sm text-blue-600 font-medium hover:underline cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                scroll={true}
              >
                View →
              </Link>
            ) : (
              <span className="text-sm text-blue-600 font-medium hover:underline">
                View →
              </span>
            )}
          </div>
          
          {/* Action buttons row - Like, Share, Bucket */}
          <div className="flex items-center gap-4 pt-1">
            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={isLiking || hasLiked}
              className={`flex items-center gap-1.5 transition-all ${
                hasLiked
                  ? 'text-blue-600 cursor-default'
                  : 'text-gray-500 hover:text-blue-600 active:scale-95'
              } ${isLiking ? 'opacity-50' : ''}`}
              title={hasLiked ? 'You liked this!' : 'Give this itinerary a thumbs up'}
            >
              <span className="text-sm font-semibold min-w-[16px] text-center">{currentLikes}</span>
              <ThumbsUp className={`w-4 h-4 ${justLiked ? 'animate-bounce' : ''} ${hasLiked ? 'fill-current' : ''}`} />
            </button>
            
            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={isSharing}
              className={`text-gray-500 hover:text-blue-600 transition-all active:scale-95 ${
                isSharing ? 'opacity-50' : ''
              }`}
              title="Share this itinerary"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            {/* Bucket list button */}
            <button
              onClick={inBucketList ? handleRemoveFromBucketList : handleAddToBucketList}
              disabled={isAddingToBucket || isCheckingBucketList}
              className={`transition-all ${
                inBucketList
                  ? 'text-blue-600 cursor-default'
                  : 'text-gray-500 hover:text-blue-600 active:scale-95'
              } ${(isAddingToBucket || isCheckingBucketList) ? 'opacity-50' : ''}`}
              title={inBucketList ? 'Remove from bucket list' : 'Add to bucket list'}
            >
              <Heart className={`w-4 h-4 ${inBucketList ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      ) : showBucketListActions ? (
        <>
          {/* Bucket List Actions */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-xs text-gray-500">
                  Added {new Date(created_at).toLocaleDateString()}
                </span>
                {creator_name && (
                  <span className="text-xs text-gray-600 truncate">
                    <span className="text-gray-400">by</span> <span className="font-medium text-indigo-600">{creator_name}</span>
                  </span>
                )}
              </div>
            </div>
            
            {/* Action buttons for bucket list */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleViewClick}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" /> View
              </button>
              <button 
                type="button"
                onClick={handleRemoveFromBucketList}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-current" /> Remove
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-4">
            Created {new Date(created_at).toLocaleDateString()}
          </p>
          
          {/* Actions (only in My Plans) */}
          <div className="pt-4 border-t border-gray-200">
            {/* Primary actions row */}
            <div className="flex gap-2">
              <Link href={`/itinerary/${id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <Eye className="w-4 h-4" /> View
                </Button>
              </Link>
              <Link href={`/itinerary/${id}/edit`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <Pencil className="w-4 h-4" /> Edit & Regenerate
                </Button>
              </Link>
              
              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="px-3">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onTogglePrivacy && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        onTogglePrivacy(id, is_private);
                      }}
                      className="cursor-pointer"
                    >
                      {is_private ? (
                        <>
                          <Globe className="w-4 h-4 mr-2" />
                          Make Public
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Make Private
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  {is_private && onToggleStatus && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        onToggleStatus(id, status || 'active');
                      }}
                      className="cursor-pointer"
                    >
                      {status === 'completed' ? (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark as Done
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          onDelete(id, ai_plan.city);
                        }}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Itinerary
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );

  // Wrap with Link only if not showing actions (public gallery)
  // Don't wrap if showing bucket list actions or my plans actions
  if (!showActions && !showBucketListActions) {
    return (
      <Link href={`/itinerary/${id}`} prefetch scroll={true}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

