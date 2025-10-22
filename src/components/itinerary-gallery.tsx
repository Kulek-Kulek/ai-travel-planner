'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ItineraryCard } from './itinerary-card';
import { Button } from './ui/button';
import { getPublicItineraries, getAllTags } from '@/lib/actions/itinerary-actions';
import { deleteItineraryAdmin, updateItineraryPrivacyAdmin } from '@/lib/actions/admin-actions';
import { toast } from 'sonner';

interface ItineraryGalleryProps {
  isAdmin?: boolean;
}

export function ItineraryGallery({ isAdmin = false }: ItineraryGalleryProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch itineraries with TanStack Query
  const { data: itinerariesData, isLoading, isFetching } = useQuery({
    queryKey: ['public-itineraries', selectedTags],
    queryFn: async () => {
      const result = await getPublicItineraries({
        tags: selectedTags,
        limit: 20,
      });
      
      if (!result.success) {
        toast.error('Failed to load itineraries');
        return { itineraries: [], total: 0 };
      }
      
      return result.data;
    },
  });

  // Fetch all available tags
  const { data: allTags = [] } = useQuery({
    queryKey: ['all-tags'],
    queryFn: async () => {
      const result = await getAllTags();
      if (!result.success) return [];
      return result.data;
    },
  });

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
  };

  // Admin: Delete itinerary
  const handleDelete = async (id: string) => {
    const result = await deleteItineraryAdmin(id);
    
    if (result.success) {
      toast.success('Itinerary deleted');
      queryClient.invalidateQueries({ queryKey: ['public-itineraries'] });
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
      queryClient.invalidateQueries({ queryKey: ['public-itineraries'] });
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

  // Group tags by category for better UX
  const popularTags = allTags.slice(0, 15);

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
          {selectedTags.length > 0 
            ? `Filtered Itineraries (${total})`
            : `Explore Itineraries (${total})`}
        </h2>
        {(isLoading || isFetching) && (
          <span className="text-sm text-gray-500 animate-pulse">Loading…</span>
        )}
      </div>

      {/* Filter Section */}
      {allTags.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Filter by Tags
            </h3>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-blue-600"
              >
                Clear ({selectedTags.length})
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {popularTags.map(tag => {
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
      )}

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
            {selectedTags.length > 0
              ? 'Try adjusting your filters or clear them to see all itineraries.'
              : 'Be the first to create an itinerary!'}
          </p>
          {selectedTags.length > 0 && (
            <Button onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Itinerary Grid */}
      {!isLoading && itineraries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {itineraries.map(itinerary => (
            <ItineraryCard 
              key={itinerary.id} 
              itinerary={itinerary}
              showActions={isAdmin}
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

