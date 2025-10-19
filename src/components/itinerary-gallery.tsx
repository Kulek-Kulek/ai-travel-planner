'use client';

import { useState, useEffect } from 'react';
import { ItineraryCard } from './itinerary-card';
import { Button } from './ui/button';
import type { Itinerary } from '@/lib/actions/itinerary-actions';
import { getPublicItineraries, getAllTags } from '@/lib/actions/itinerary-actions';
import { toast } from 'sonner';

export function ItineraryGallery() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Fetch itineraries
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      const result = await getPublicItineraries({
        tags: selectedTags,
        limit: 20,
      });
      
      if (result.success) {
        setItineraries(result.data.itineraries);
        setTotal(result.data.total);
      } else {
        toast.error('Failed to load itineraries');
      }
      
      setIsLoading(false);
    }
    
    fetchData();
  }, [selectedTags]);

  // Fetch all available tags on mount
  useEffect(() => {
    async function fetchTags() {
      const result = await getAllTags();
      if (result.success) {
        setAllTags(result.data);
      }
    }
    
    fetchTags();
  }, []);

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

  // Group tags by category for better UX
  const popularTags = allTags.slice(0, 15);

  return (
    <div className="space-y-6">
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

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {selectedTags.length > 0 
            ? `Filtered Itineraries (${total})`
            : `Explore Itineraries (${total})`}
        </h2>
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
            <ItineraryCard key={itinerary.id} itinerary={itinerary} />
          ))}
        </div>
      )}
    </div>
  );
}

