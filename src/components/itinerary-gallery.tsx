'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ItineraryCard } from './itinerary-card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getBucketListIds, type Itinerary } from '@/lib/actions/itinerary-actions';
import { deleteItineraryAdmin, updateItineraryPrivacyAdmin } from '@/lib/actions/admin-actions';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Search, X } from 'lucide-react';

interface ItineraryGalleryProps {
  isAdmin?: boolean;
}

export function ItineraryGallery({ isAdmin = false }: ItineraryGalleryProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Read initial values from URL
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tagsParam = searchParams.get('tags');
    return tagsParam ? tagsParam.split(',').filter(Boolean) : [];
  });
  
  const [destinationSearch, setDestinationSearch] = useState<string>(() => {
    return searchParams.get('destination') || '';
  });
  
  const [bucketListIds, setBucketListIds] = useState<Set<string>>(new Set());
  const [visibleNatureTags, setVisibleNatureTags] = useState(12); // Show ~2 lines initially (~6 tags per line)
  const queryClient = useQueryClient();

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (destinationSearch) {
      params.set('destination', destinationSearch);
    }
    
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }
    
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    // Update URL without triggering a navigation
    router.replace(newUrl, { scroll: false });
  }, [selectedTags, destinationSearch, pathname, router]);

  // Fetch itineraries with TanStack Query (using API route instead of server action)
  const { data: itinerariesData, isLoading, isFetching, error: queryError } = useQuery({
    queryKey: ['public-itineraries-v2', selectedTags, destinationSearch],
    queryFn: async () => {
      // Build URL with query params
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.set('tags', selectedTags.join(','));
      }
      if (destinationSearch) {
        params.set('destination', destinationSearch);
      }
      params.set('limit', '24');
      
      const url = `/api/itineraries?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ BROWSER: API error:', error);
        toast.error('Failed to load itineraries');
        return { itineraries: [], total: 0 };
      }
      
      const data = await response.json();
      return data;
    },
    retry: false,
    staleTime: 0,
  });
  
  // Log query errors
  if (queryError) {
    console.error('❌ React Query Error:', queryError);
  }

  // Fetch all available tags (using API route)
  const { data: tagsData } = useQuery({
    queryKey: ['all-tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags');
      if (!response.ok) {
        console.error('❌ BROWSER: Failed to fetch tags');
        return { tags: [] };
      }
      const data = await response.json();
      return data;
    },
  });
  
  const allTags = tagsData?.tags || [];
  
  // Fetch bucket list IDs for authenticated users
  // Re-fetch whenever we navigate to this page or itineraries change
  useEffect(() => {
    async function loadBucketListIds() {
      // Check if user is authenticated
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setBucketListIds(new Set());
        return;
      }
      
      const result = await getBucketListIds();
      if (result.success) {
        setBucketListIds(new Set(result.data));
      }
    }
    
    loadBucketListIds();
    
    // Also listen for focus event to refresh when user returns from login
    const handleFocus = () => {
      loadBucketListIds();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [itinerariesData]); // Re-fetch when itineraries data changes

  const itineraries = itinerariesData?.itineraries || [];
  const total = itinerariesData?.total || 0;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setDestinationSearch('');
  };

  const clearDestinationSearch = () => {
    setDestinationSearch('');
  };

  // Admin: Delete itinerary
  const handleDelete = async (id: string) => {
    const result = await deleteItineraryAdmin(id);
    
    if (result.success) {
      toast.success('Itinerary deleted');
      queryClient.invalidateQueries({ queryKey: ['public-itineraries-v2'] });
      queryClient.invalidateQueries({ queryKey: ['all-tags'] });
    } else {
      toast.error(result.error);
    }
  };

  // Admin: Toggle privacy
  const handleTogglePrivacy = async (id: string, currentPrivacy: boolean) => {
    const result = await updateItineraryPrivacyAdmin(id, !currentPrivacy);
    
    if (result.success) {
      toast.success(`Set to ${!currentPrivacy ? 'private' : 'public'}`);
      queryClient.invalidateQueries({ queryKey: ['public-itineraries-v2'] });
    } else {
      toast.error(result.error);
    }
  };

  // Admin: Toggle status
  const handleToggleStatus = async (id: string) => {
    // For admin view, we don't need status toggle on gallery
    // Redirect to edit page instead
    window.location.href = `/itinerary/${id}/edit`;
  };

  // Organize tags into 3 categories
  const DURATION_TAGS = [
    "1 day",
    "2-3 days",
    "4-6 days",
    "7 days",
    "8-10 days",
    "11-13 days",
    "14 days",
    "14+ days"
  ];
  
  const GROUP_SIZE_TAGS = [
    "solo",
    "2 people",
    "group",
    "family"
  ];
  
  // Filter out duration and group tags from allTags to get nature tags
  const natureTags = allTags.filter((tag: string) => 
    !DURATION_TAGS.includes(tag) && !GROUP_SIZE_TAGS.includes(tag)
  );
  
  // Handle "Show More" for nature tags
  const displayedNatureTags = natureTags.slice(0, visibleNatureTags);
  const hasMoreNatureTags = natureTags.length > visibleNatureTags;
  const showLessButton = visibleNatureTags > 12;
  
  const handleShowMoreTags = () => {
    setVisibleNatureTags(prev => prev + 18); // Add ~3 lines (6 tags per line)
  };
  
  const handleShowLessTags = () => {
    setVisibleNatureTags(12); // Reset to initial 2 lines
  };

  return (
    <div className="space-y-6">
      {/* Admin Mode Indicator */}
      {isAdmin && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="font-semibold text-red-900">Admin Mode Active</p>
              <p className="text-sm text-red-700">
                You can edit, delete, and manage all itineraries directly from this gallery
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {selectedTags.length > 0 || destinationSearch
            ? `Filtered Itineraries (${total})`
            : `Explore Itineraries (${total})`}
        </h2>
        {(isLoading || isFetching) && (
          <span className="text-sm text-gray-500 animate-pulse">Loading…</span>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 space-y-5">
        {/* Destination Search */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Search by Destination
            </h3>
            {destinationSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDestinationSearch}
                className="text-blue-600"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="e.g., Paris, Tokyo, New York..."
              value={destinationSearch}
              onChange={(e) => setDestinationSearch(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </div>

        {/* Tag Filters - Organized in 3 Sections */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Filter by Tags
            </h3>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags([])}
                className="text-blue-600"
              >
                Clear ({selectedTags.length})
              </Button>
            )}
          </div>

          {/* Duration Tags Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Duration
            </h4>
            <div className="flex flex-wrap gap-2">
              {DURATION_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-2 border-blue-600'
                        : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Size Tags Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Group Size
            </h4>
            <div className="flex flex-wrap gap-2">
              {GROUP_SIZE_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-2 border-blue-600'
                        : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nature/Interest Tags Section */}
          {natureTags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Interests & Activities
              </h4>
              <div className="flex flex-wrap gap-2">
                {displayedNatureTags.map((tag: string) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white border-2 border-blue-600'
                          : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              
              {/* Show More / Show Less Buttons */}
              {(hasMoreNatureTags || showLessButton) && (
                <div className="mt-3 flex gap-2">
                  {hasMoreNatureTags && (
                    <button
                      onClick={handleShowMoreTags}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center gap-1"
                    >
                      Show more tags
                      <span className="text-xs">({natureTags.length - visibleNatureTags} more)</span>
                    </button>
                  )}
                  {showLessButton && (
                    <button
                      onClick={handleShowLessTags}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium hover:underline"
                    >
                      Show less
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clear All Filters Button */}
        {(selectedTags.length > 0 || destinationSearch) && (
          <div className="pt-2 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="w-full"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="bg-gray-100 rounded-lg h-64 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && itineraries.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No itineraries found
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedTags.length > 0 || destinationSearch
              ? 'Try adjusting your filters or clear them to see all itineraries.'
              : 'Be the first to create an itinerary!'}
          </p>
          {(selectedTags.length > 0 || destinationSearch) && (
            <Button onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Itinerary Grid */}
      {!isLoading && itineraries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {itineraries.map((itinerary: Itinerary) => (
            <ItineraryCard 
              key={itinerary.id} 
              itinerary={itinerary}
              showActions={isAdmin}
              isInBucketList={bucketListIds.has(itinerary.id)}
              onTogglePrivacy={isAdmin ? handleTogglePrivacy : undefined}
              onToggleStatus={isAdmin ? handleToggleStatus : undefined}
              onDelete={isAdmin ? (id) => handleDelete(id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

