'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getItinerary } from '@/lib/actions/itinerary-actions';
import { generateItinerary } from '@/lib/actions/ai-actions';
import type { Itinerary } from '@/lib/actions/itinerary-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditItineraryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(1);
  const [hasAccessibilityNeeds, setHasAccessibilityNeeds] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadItinerary() {
      const result = await getItinerary(id);
      
      if (!result.success || !result.data) {
        toast.error('Itinerary not found or access denied');
        router.push('/my-plans');
        return;
      }
      
      // Check ownership - only owner can edit
      if (!result.data.user_id) {
        toast.error('Cannot edit anonymous itineraries');
        router.push('/my-plans');
        return;
      }
      
      setItinerary(result.data);
      setDays(result.data.days);
      setTravelers(result.data.travelers);
      setNotes(result.data.notes || '');
      setIsLoading(false);
    }
    
    loadItinerary();
  }, [id, router]);

  // Cycle through loading messages while regenerating
  useEffect(() => {
    if (!isRegenerating) {
      setLoadingMessage('');
      return;
    }

    const messages = [
      '🔍 Analyzing updated preferences...',
      '🌍 Re-exploring destination...',
      '🎨 Crafting new itinerary...',
      '🗺️ Replanning activities...',
      '✨ Finalizing changes...',
    ];

    let currentIndex = 0;
    setLoadingMessage(messages[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [isRegenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itinerary) return;
    
    // Validation
    if (days < 1 || days > 30) {
      toast.error('Days must be between 1 and 30');
      return;
    }
    
    if (travelers < 1 || travelers > 20) {
      toast.error('Travelers must be between 1 and 20');
      return;
    }

    setIsRegenerating(true);

    try {
      // Call AI to regenerate the itinerary with new parameters
      const result = await generateItinerary({
        destination: itinerary.destination, // Keep same destination
        days,
        travelers,
        hasAccessibilityNeeds,
        notes,
        keepExistingPhoto: true, // Don't fetch new photo
        existingPhotoData: {
          image_url: itinerary.image_url,
          image_photographer: itinerary.image_photographer,
          image_photographer_url: itinerary.image_photographer_url,
        },
      });

      if (result.success) {
        toast.success('✅ Itinerary regenerated successfully!', {
          description: 'Your plan has been updated with new AI-generated content',
        });
        router.push(`/itinerary/${result.data.id}`);
      } else {
        toast.error('Failed to regenerate itinerary', {
          description: result.error,
        });
        setIsRegenerating(false);
      }
    } catch (error) {
      toast.error('Unexpected error occurred');
      console.error('Regeneration error:', error);
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-gray-600">Loading itinerary...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <Link
              href="/my-plans"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to My Plans
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Edit & Regenerate Itinerary
          </h1>
          <p className="text-gray-600 mb-8">
            Update your trip details and AI will regenerate the itinerary
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Destination (Read-only) */}
            <div>
              <Label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-2">
                Destination
              </Label>
              <Input
                id="destination"
                type="text"
                value={itinerary.destination}
                disabled
                className="w-full bg-gray-100 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500 mt-1">
                💡 Destination cannot be changed. Want a different destination? Create a new itinerary instead.
              </p>
            </div>

            {/* Editable Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Number of Days */}
              <div>
                <Label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Days
                </Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                  disabled={isRegenerating}
                  required
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  1-30 days
                </p>
              </div>

              {/* Number of Travelers */}
              <div>
                <Label htmlFor="travelers" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Travelers
                </Label>
                <Input
                  id="travelers"
                  type="number"
                  min="1"
                  max="20"
                  value={travelers}
                  onChange={(e) => setTravelers(parseInt(e.target.value) || 1)}
                  disabled={isRegenerating}
                  required
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  1-20 travelers
                </p>
              </div>
            </div>

            {/* Accessibility Needs */}
            <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="accessibility" className="text-base">
                  Accessibility Requirements
                </Label>
                <p className="text-sm text-gray-500">
                  Enable wheelchair access, elevator availability, and other mobility considerations
                </p>
              </div>
              <Switch
                id="accessibility"
                checked={hasAccessibilityNeeds}
                onCheckedChange={setHasAccessibilityNeeds}
                disabled={isRegenerating}
              />
            </div>

            {/* Notes / Preferences */}
            <div>
              <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Travel Preferences & Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., I'm interested in art museums, local cuisine, romantic spots. Vegetarian options preferred."
                rows={6}
                disabled={isRegenerating}
                className="w-full resize-y"
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-1">
                Tell AI about your preferences, interests, dietary needs, or special requirements (max 500 characters)
              </p>
            </div>

            {/* Warning Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> Clicking &quot;Regenerate with AI&quot; will create a completely new itinerary 
                with fresh AI-generated content. The current itinerary will be replaced.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isRegenerating}
                size="lg"
              >
                {isRegenerating ? (
                  <span className="animate-pulse">
                    {loadingMessage || '✨ Regenerating...'}
                  </span>
                ) : (
                  <>
                    <span className="mr-2">✨</span>
                    Regenerate with AI
                  </>
                )}
              </Button>
              <Link href="/my-plans" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={isRegenerating}
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </form>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>💡 How it works:</strong>
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Update days, travelers, or notes above</li>
              <li>AI will generate a completely new itinerary</li>
              <li>Destination stays the same ({itinerary.destination})</li>
              <li>This will create a NEW itinerary (your old one will remain)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

