'use client';

import { useState, useEffect } from 'react';
import { getMyItineraries, updateItineraryPrivacy, deleteItinerary } from '@/lib/actions/itinerary-actions';
import type { Itinerary } from '@/lib/actions/itinerary-actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MyPlansPage() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItineraries = async () => {
    setIsLoading(true);
    const result = await getMyItineraries();
    
    if (result.success) {
      setItineraries(result.data);
    } else {
      toast.error('Failed to load your itineraries');
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItineraries();
  }, []);

  const handleTogglePrivacy = async (id: string, currentPrivacy: boolean) => {
    const result = await updateItineraryPrivacy(id, !currentPrivacy);
    
    if (result.success) {
      toast.success(`Itinerary is now ${!currentPrivacy ? 'private' : 'public'}`);
      fetchItineraries(); // Refresh list
    } else {
      toast.error('Failed to update privacy');
    }
  };

  const handleDelete = async (id: string, destination: string) => {
    if (!confirm(`Are you sure you want to delete the itinerary for ${destination}?`)) {
      return;
    }

    const result = await deleteItinerary(id);
    
    if (result.success) {
      toast.success('Itinerary deleted');
      fetchItineraries(); // Refresh list
    } else {
      toast.error('Failed to delete itinerary');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Itineraries
          </h1>
          <p className="text-gray-600">
            Manage your saved travel plans
          </p>
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
              <div
                key={itinerary.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-200"
              >
                {/* Header */}
                <div className="mb-4">
                  <Link href={`/itinerary/${itinerary.id}`}>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 cursor-pointer">
                      {itinerary.ai_plan.city || itinerary.destination}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <span>📅 {itinerary.days} days</span>
                    <span>👥 {itinerary.travelers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        itinerary.is_private
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {itinerary.is_private ? '🔒 Private' : '🌍 Public'}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {itinerary.tags && itinerary.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {itinerary.tags.slice(0, 4).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Created date */}
                <p className="text-xs text-gray-500 mb-4">
                  Created {new Date(itinerary.created_at).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Link href={`/itinerary/${itinerary.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePrivacy(itinerary.id, itinerary.is_private)}
                  >
                    {itinerary.is_private ? '🌍' : '🔒'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(itinerary.id, itinerary.ai_plan.city)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

