'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Heart } from 'lucide-react';

interface RemoveFromBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: string;
  onConfirm: () => void;
}

export function RemoveFromBucketDialog({
  open,
  onOpenChange,
  destination,
  onConfirm,
}: RemoveFromBucketDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Remove from Bucket List?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to remove{' '}
                <strong className="text-gray-900">{destination}</strong> from your bucket list?
              </p>
              <p className="text-sm text-gray-500">
                You can always add it back later by clicking the heart icon.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

