'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: string;
  onConfirm: () => void;
}

export function DeleteItineraryDialog({
  open,
  onOpenChange,
  destination,
  onConfirm,
}: DeleteItineraryDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const isMatch = confirmText.toLowerCase() === destination.toLowerCase();

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm();
      setConfirmText(''); // Reset for next time
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setConfirmText(''); // Reset on cancel
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            ⚠️ Delete Itinerary?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div>
                This action cannot be undone. This will permanently delete your itinerary for{' '}
                <strong className="text-gray-900">{destination}</strong>.
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-destination" className="text-gray-700">
                  To confirm, type <strong className="text-red-600">{destination}</strong> below:
                </Label>
                <Input
                  id="confirm-destination"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={`Type "${destination}" to confirm`}
                  className="border-red-300 focus:border-red-500 focus:ring-red-500"
                  autoComplete="off"
                />
                {confirmText && !isMatch && (
                  <div className="text-sm text-red-600">
                    Destination doesn&apos;t match. Please type exactly: {destination}
                  </div>
                )}
                {isMatch && (
                  <div className="text-sm text-green-600">
                    ✓ Confirmed. You can now delete this itinerary.
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isMatch}
            className={`${
              isMatch
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Delete Itinerary
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

