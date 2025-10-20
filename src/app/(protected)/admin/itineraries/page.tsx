'use client';

import { useState, useEffect } from 'react';
import { getAllItinerariesAdmin, deleteItineraryAdmin, updateItineraryPrivacyAdmin, getAdminStats, type AdminItinerary } from '@/lib/actions/admin-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { DeleteItineraryDialog } from '@/components/delete-itinerary-dialog';

type AdminStats = {
  totalItineraries: number;
  publicItineraries: number;
  privateItineraries: number;
  anonymousItineraries: number;
  totalUsers: number;
};

export default function AdminItinerariesPage() {
  const [itineraries, setItineraries] = useState<AdminItinerary[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'anonymous'>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; destination: string }>({
    open: false,
    id: '',
    destination: '',
  });

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadData = async () => {
    setIsLoading(true);
    
    const [itinerariesResult, statsResult] = await Promise.all([
      getAllItinerariesAdmin({ filter, limit: 100 }),
      getAdminStats(),
    ]);
    
    if (itinerariesResult.success) {
      setItineraries(itinerariesResult.data.itineraries);
    } else {
      toast.error(itinerariesResult.error);
    }
    
    if (statsResult.success) {
      setStats(statsResult.data);
    }
    
    setIsLoading(false);
  };

  const handleDelete = async () => {
    const result = await deleteItineraryAdmin(deleteDialog.id);
    
    if (result.success) {
      toast.success('Itinerary deleted');
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleTogglePrivacy = async (id: string, currentPrivacy: boolean) => {
    const result = await updateItineraryPrivacyAdmin(id, !currentPrivacy);
    
    if (result.success) {
      toast.success(`Set to ${!currentPrivacy ? 'private' : 'public'}`);
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Home
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛡️ Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage all itineraries across the platform
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Total Itineraries</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalItineraries}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-6">
              <p className="text-sm text-green-600 mb-1">Public</p>
              <p className="text-3xl font-bold text-green-900">{stats.publicItineraries}</p>
            </div>
            <div className="bg-gray-50 rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-1">Private</p>
              <p className="text-3xl font-bold text-gray-900">{stats.privateItineraries}</p>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <p className="text-sm text-blue-600 mb-1">Anonymous</p>
              <p className="text-3xl font-bold text-blue-900">{stats.anonymousItineraries}</p>
            </div>
            <div className="bg-purple-50 rounded-lg shadow p-6">
              <p className="text-sm text-purple-600 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-purple-900">{stats.totalUsers}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={filter === 'public' ? 'default' : 'outline'}
              onClick={() => setFilter('public')}
              size="sm"
            >
              Public
            </Button>
            <Button
              variant={filter === 'private' ? 'default' : 'outline'}
              onClick={() => setFilter('private')}
              size="sm"
            >
              Private
            </Button>
            <Button
              variant={filter === 'anonymous' ? 'default' : 'outline'}
              onClick={() => setFilter('anonymous')}
              size="sm"
            >
              Anonymous
            </Button>
          </div>
        </div>

        {/* Itineraries Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : itineraries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No itineraries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Privacy</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {itineraries.map((itinerary) => (
                    <tr key={itinerary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/itinerary/${itinerary.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {itinerary.destination}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {itinerary.days} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {itinerary.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          itinerary.is_private 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {itinerary.is_private ? '🔒 Private' : '🌍 Public'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {itinerary.status || 'active'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(itinerary.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePrivacy(itinerary.id, itinerary.is_private)}
                          >
                            {itinerary.is_private ? 'Make Public' : 'Make Private'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialog({ 
                              open: true, 
                              id: itinerary.id, 
                              destination: itinerary.destination 
                            })}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <DeleteItineraryDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        destination={deleteDialog.destination}
        onConfirm={handleDelete}
      />
    </div>
  );
}

