'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBucketList, removeFromBucketList } from '@/lib/actions/itinerary-actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ItineraryCard } from '@/components/itinerary-card';
import { RemoveFromBucketDialog } from '@/components/remove-from-bucket-dialog';
import { toast } from 'sonner';
import { Compass, Heart } from 'lucide-react';

export default function BucketListPage() {
  const queryClient = useQueryClient();
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; id: string; destination: string }>({
    open: false,
    id: '',
    destination: '',
  });

  // Use TanStack Query for better caching
  const { data: itineraries = [], isLoading } = useQuery({
    queryKey: ['bucket-list'],
    queryFn: async () => {
      const result = await getBucketList();
      if (!result.success) {
        toast.error('Failed to load your bucket list');
        return [];
      }
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const handleRemoveClick = (id: string, destination: string) => {
    setRemoveDialog({ open: true, id, destination });
  };

  const confirmRemove = async (id: string) => {
    try {
      const result = await removeFromBucketList(id);
      
      if (result.success) {
        toast.success('Removed from bucket list');
        // Invalidate queries to refresh
        queryClient.invalidateQueries({ queryKey: ['bucket-list'] });
        queryClient.invalidateQueries({ queryKey: ['bucket-list-ids'] });
      } else {
        toast.error(result.error || 'Failed to remove from bucket list');
      }
    } catch (error) {
      console.error('Error removing from bucket list:', error);
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Bucket List
            </h1>
            <p className="text-gray-600">
              Your saved travel plans and dream destinations
            </p>
          </div>
          <Link href="/">
            <Button size="lg" className="shadow-md w-full sm:w-auto gap-2">
              <Compass className="w-5 h-5" />
              Explore Itineraries
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-white rounded-lg shadow h-64 animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && itineraries.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your bucket list is empty
            </h3>
            <p className="text-gray-600 mb-6">
              Start adding itineraries you want to visit in the future!
            </p>
            <Link href="/">
              <Button className="gap-2">
                <Compass className="w-4 h-4" />
                Explore Itineraries
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && itineraries.length > 0 && (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {itineraries.length} {itineraries.length === 1 ? 'itinerary' : 'itineraries'} in your bucket list
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itineraries.map(itinerary => (
                <ItineraryCard
                  key={itinerary.id}
                  itinerary={itinerary}
                  showBucketListActions={true}
                  isInBucketList={true}
                  onRemoveFromBucketList={(id) => handleRemoveClick(id, itinerary.ai_plan.city || itinerary.destination)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Remove Confirmation Dialog */}
      <RemoveFromBucketDialog
        open={removeDialog.open}
        onOpenChange={(open) => setRemoveDialog({ ...removeDialog, open })}
        destination={removeDialog.destination}
        onConfirm={() => confirmRemove(removeDialog.id)}
      />
    </div>
  );
}

