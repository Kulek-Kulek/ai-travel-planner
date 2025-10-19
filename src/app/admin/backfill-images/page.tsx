'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { backfillItineraryImages, getItinerariesWithoutImagesCount } from '@/lib/actions/backfill-images';
import { toast } from 'sonner';
import Link from 'next/link';

export default function BackfillImagesPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [result, setResult] = useState<{
    processed: number;
    updated: number;
    failed: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadCount();
  }, []);

  const loadCount = async () => {
    const response = await getItinerariesWithoutImagesCount();
    if (response.success) {
      setCount(response.data);
    }
  };

  const handleClearUnsplash = async () => {
    setIsClearing(true);
    
    toast.loading('Clearing old Unsplash images...', {
      id: 'clearing',
    });

    try {
      const response = await fetch('/api/clear-unsplash-images', {
        method: 'POST',
      });
      const data = await response.json();
      
      toast.dismiss('clearing');
      
      if (data.success) {
        toast.success(`Cleared ${data.cleared} Unsplash images!`, {
          description: 'Now click "Backfill" to add Pexels images',
        });
        loadCount(); // Refresh count
      } else {
        toast.error('Failed to clear images', {
          description: data.error,
        });
      }
    } catch (error) {
      toast.dismiss('clearing');
      toast.error('Failed to clear images');
    }
    
    setIsClearing(false);
  };

  const handleBackfill = async () => {
    setIsProcessing(true);
    setResult(null);
    
    toast.loading('Fetching images from Pexels...', {
      id: 'backfill',
      description: 'This may take a few minutes',
    });

    const response = await backfillItineraryImages();
    
    toast.dismiss('backfill');
    
    if (response.success) {
      setResult(response.data);
      toast.success('Backfill complete!', {
        description: `Updated ${response.data.updated} itineraries`,
      });
      loadCount(); // Refresh count
    } else {
      toast.error('Backfill failed', {
        description: response.error,
      });
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          ← Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🖼️ Backfill Images
          </h1>
          
          <p className="text-gray-600 mb-6">
            Add Pexels photos to existing itineraries that were created before the image feature was added.
          </p>

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">Status</h2>
            {count !== null ? (
              <p className="text-blue-800">
                {count === 0 ? (
                  <>✅ All itineraries have images! No backfill needed.</>
                ) : (
                  <>📸 <strong>{count}</strong> {count === 1 ? 'itinerary' : 'itineraries'} without images</>
                )}
              </p>
            ) : (
              <p className="text-blue-800">Loading...</p>
            )}
          </div>

          {/* How it works */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">How it works:</h2>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Finds all itineraries without images</li>
              <li>Fetches relevant photos from Pexels (free, unlimited)</li>
              <li>Updates itineraries with image URLs</li>
              <li>Processes up to 100 at a time</li>
              <li>Takes ~10-30 seconds depending on count</li>
            </ul>
          </div>

          {/* Results */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-green-900 mb-2">✅ Results:</h2>
              <div className="text-sm text-green-800 space-y-1">
                <p>• Processed: <strong>{result.processed}</strong></p>
                <p>• Updated: <strong>{result.updated}</strong></p>
                {result.failed > 0 && (
                  <p>• Failed: <strong>{result.failed}</strong></p>
                )}
              </div>
            </div>
          )}

          {/* Quick Fix for Unsplash Migration */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-orange-900 mb-2">🔧 Migrate from Unsplash</h2>
            <p className="text-sm text-orange-800 mb-3">
              If you're seeing errors about Unsplash images, click below to clear them first:
            </p>
            <Button
              onClick={handleClearUnsplash}
              disabled={isClearing}
              size="sm"
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {isClearing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Clearing...
                </>
              ) : (
                <>
                  <span className="mr-2">🧹</span>
                  Clear Old Unsplash Images
                </>
              )}
            </Button>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleBackfill}
            disabled={isProcessing || count === 0}
            size="lg"
            className="w-full"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : count === 0 ? (
              'No Images to Backfill'
            ) : (
              <>
                <span className="mr-2">✨</span>
                Backfill {count} {count === 1 ? 'Itinerary' : 'Itineraries'}
              </>
            )}
          </Button>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>✨ Pexels API:</strong> Completely free with unlimited requests! 
              No rate limits, no quotas. Attribution is optional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

