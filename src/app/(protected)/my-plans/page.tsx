'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyItineraries, updateItineraryPrivacy, updateItineraryStatus, deleteItinerary, getBucketListIds } from '@/lib/actions/itinerary-actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ItineraryCard } from '@/components/itinerary-card';
import { ItineraryCardSkeleton } from '@/components/itinerary-card-skeleton';
import { DeleteItineraryDialog } from '@/components/delete-itinerary-dialog';
import { toast } from 'sonner';

export default function MyPlansPage() {
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; destination: string }>({
    open: false,
    id: '',
    destination: '',
  });

  // Use TanStack Query for better caching and performance
  const { data: itineraries = [], isLoading: isLoadingItineraries } = useQuery({
    queryKey: ['my-itineraries'],
    queryFn: async () => {
      const result = await getMyItineraries();
      if (!result.success) {
        toast.error('Failed to load your itineraries');
        return [];
      }
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Fetch bucket list IDs separately
  const { data: bucketListIds = new Set<string>(), isLoading: isLoadingBucket } = useQuery({
    queryKey: ['bucket-list-ids'],
    queryFn: async () => {
      const result = await getBucketListIds();
      return result.success ? new Set(result.data) : new Set<string>();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const isLoading = isLoadingItineraries || isLoadingBucket;

  const handleTogglePrivacy = async (id: string, currentPrivacy: boolean) => {
    const result = await updateItineraryPrivacy(id, !currentPrivacy);
    
    if (result.success) {
      const isNowPrivate = !currentPrivacy;
      
      // Clear and descriptive toast message
      toast.success(
        isNowPrivate ? '🔒 Itinerary is now private' : '🌍 Itinerary is now public',
        {
          description: isNowPrivate 
            ? 'This itinerary will NOT appear in the public gallery'
            : 'This itinerary will appear in the public gallery for everyone to see',
        }
      );
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['my-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['public-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['all-tags'] });
    } else {
      toast.error('Failed to update privacy');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    const result = await updateItineraryStatus(id, newStatus);
    
    if (result.success) {
      toast.success(
        newStatus === 'completed' 
          ? '✅ Itinerary marked as completed!' 
          : '↩️ Itinerary reactivated'
      );
      // Invalidate to refresh
      queryClient.invalidateQueries({ queryKey: ['my-itineraries'] });
    } else {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = (id: string, destination: string) => {
    setDeleteDialog({ open: true, id, destination });
  };

  const confirmDelete = async () => {
    const result = await deleteItinerary(deleteDialog.id);
    
    if (result.success) {
      toast.success('Itinerary deleted successfully');
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['my-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['public-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['all-tags'] });
      queryClient.invalidateQueries({ queryKey: ['bucket-list-ids'] });
    } else {
      toast.error('Failed to delete itinerary');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Itineraries
            </h1>
            <p className="text-gray-600">
              Manage your saved travel plans
            </p>
          </div>
          <Link href="/">
            <Button size="lg" className="shadow-md w-full sm:w-auto">
              <span className="mr-2">✨</span>
              Create New Itinerary
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <ItineraryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && itineraries.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No itineraries yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first travel plan to get started!
            </p>
            <Link href="/">
              <Button>Create Itinerary</Button>
            </Link>
          </div>
        )}

        {!isLoading && itineraries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map(itinerary => (
              <ItineraryCard
                key={itinerary.id}
                itinerary={itinerary}
                showActions={true}
                isInBucketList={bucketListIds.has(itinerary.id)}
                onTogglePrivacy={handleTogglePrivacy}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteItineraryDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        destination={deleteDialog.destination}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

