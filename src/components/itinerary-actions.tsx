'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DeleteItineraryDialog } from '@/components/delete-itinerary-dialog';
import { deleteItinerary } from '@/lib/actions/itinerary-actions';
import { toast } from 'sonner';
import { Pencil, Settings, Trash2} from 'lucide-react';

interface ItineraryActionsProps {
  itineraryId: string;
  destination: string;
  isOwner: boolean;
}

export function ItineraryActions({ itineraryId, destination, isOwner }: ItineraryActionsProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState(false);

  const handleDelete = async () => {
    const result = await deleteItinerary(itineraryId);
    
    if (result.success) {
      toast.success('Itinerary deleted successfully');
      router.push('/my-plans');
    } else {
      toast.error('Failed to delete itinerary');
    }
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
      <div className="space-y-4">
        {isOwner && (
          <>
            <div className="flex items-center justify-center gap-2 text-gray-700 mb-4">
              <Settings className="w-5 h-5" />
              <p className="font-medium text-lg">Manage this itinerary</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/itinerary/${itineraryId}/edit`}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <Pencil className="w-4 h-4" />
                  Edit & Regenerate
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => setDeleteDialog(true)}
                className="w-full sm:w-auto gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Itinerary
              </Button>
            </div>
            <div className="border-t border-gray-200 my-4"></div>
          </>
        )}
        
        <p className="text-gray-700 text-center mb-4">
          ✨ Want to create your own personalized itinerary?
        </p>
        <div className="flex justify-center">
          <Link href="/">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Create New Itinerary
            </Button>
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteItineraryDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        destination={destination}
        onConfirm={handleDelete}
      />
    </div>
  );
}

