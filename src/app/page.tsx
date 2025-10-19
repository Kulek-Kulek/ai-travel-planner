'use client';

import { useState } from 'react';
import { ItineraryForm } from '@/components/itinerary-form';
import { ItineraryGallery } from '@/components/itinerary-gallery';
import { generateItinerary } from '@/lib/actions/ai-actions';
import { toast } from 'sonner';
import Link from 'next/link';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (data: any) => {
    setIsGenerating(true);
    setResult(null);

    // Show loading toast
    toast.loading('AI is generating your itinerary...', {
      id: 'generating',
      description: 'This may take 10-20 seconds',
    });

    try {
      // Call real AI generation Server Action
      const response = await generateItinerary({
        destination: data.destination,
        days: data.days,
        travelers: data.travelers,
        notes: data.notes,
      });

      // Dismiss loading toast
      toast.dismiss('generating');

      if (response.success) {
        // Show success toast with save confirmation
        toast.success('Itinerary generated and saved!', {
          description: `${data.days}-day trip to ${response.data.city}`,
          action: {
            label: 'View',
            onClick: () => window.location.href = `/itinerary/${response.data.id}`,
          },
        });

        setResult({
          ...data,
          aiPlan: response.data,
        });
      } else {
        // Show error toast
        toast.error('Failed to generate itinerary', {
          description: response.error,
        });
      }
    } catch (error) {
      toast.dismiss('generating');
      toast.error('Unexpected error occurred', {
        description: 'Please try again or contact support',
      });
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ✈️ AI Travel Planner
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-6">
            Generate personalized travel itineraries in seconds
          </p>
          <p className="text-lg text-blue-50">
            Create, save, and discover amazing travel plans powered by AI
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Form and Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">
              Create Your Itinerary
            </h2>
            <ItineraryForm onSubmit={handleSubmit} isLoading={isGenerating} />
          </div>

          {/* Preview/Result Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">
              Your Itinerary
            </h2>
            
            {!result && !isGenerating && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-500">
                  Fill in the form and click Generate to create your personalized travel itinerary
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 animate-bounce">🤖</div>
                <p className="text-gray-700 font-medium">
                  AI is creating your perfect itinerary...
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  This may take a few seconds
                </p>
              </div>
            )}

            {result && !isGenerating && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-green-900 mb-2">
                    {result.aiPlan?.city || result.destination}
                  </h3>
                  <p className="text-green-700 text-sm">
                    {result.days} days • {result.travelers} traveler{result.travelers > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Show first 2 days as preview */}
                {result.aiPlan?.days?.slice(0, 2).map((day: any, dayIndex: number) => (
                  <div key={dayIndex} className="border-l-4 border-blue-500 pl-4 space-y-3">
                    <h4 className="font-semibold text-gray-900">{day.title}</h4>
                    
                    {day.places?.slice(0, 3).map((place: any, placeIndex: number) => (
                      <div key={placeIndex} className="bg-gray-50 rounded-lg p-3">
                        <p className="font-medium text-gray-900">{place.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{place.desc}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          ⏱️ {place.time}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}

                {result.aiPlan?.days?.length > 2 && (
                  <p className="text-sm text-gray-500 text-center">
                    + {result.aiPlan.days.length - 2} more days...
                  </p>
                )}

                {result.aiPlan?.tags && result.aiPlan.tags.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">🏷️ Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.aiPlan.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    ✅ <strong>Itinerary saved!</strong> View your full itinerary or browse more plans below.
                  </p>
                  <Link
                    href={`/itinerary/${result.aiPlan.id}`}
                    className="inline-block mt-2 text-green-700 font-medium hover:underline"
                  >
                    View Full Itinerary →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Public Itineraries Gallery */}
        <div className="mt-16">
          <ItineraryGallery />
        </div>
      </main>
    </div>
  );
}
