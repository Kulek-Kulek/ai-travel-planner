'use client';

import { useState } from 'react';
import { ItineraryForm } from '@/components/itinerary-form';
import { ToastDemo } from '@/components/toast-demo';
import { generateItinerary } from '@/lib/actions/ai-actions';
import { toast } from 'sonner';

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
        // Show success toast
        toast.success('Itinerary generated successfully!', {
          description: `${data.days}-day trip to ${response.data.city}`,
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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            ✈️ AI Travel Planner
          </h1>
          <p className="mt-2 text-gray-600">
            Create personalized travel itineraries with AI
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">
              Plan Your Trip
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

                {result.aiPlan?.days?.map((day: any, dayIndex: number) => (
                  <div key={dayIndex} className="border-l-4 border-blue-500 pl-4 space-y-3">
                    <h4 className="font-semibold text-gray-900">{day.title}</h4>
                    
                    {day.places?.map((place: any, placeIndex: number) => (
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

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    💡 <strong>Next steps:</strong> Add authentication to save this itinerary, 
                    or generate a new one with different preferences!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900">
            🎯 What We've Built So Far
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded p-4">
              <div className="text-2xl mb-2">✅</div>
              <h4 className="font-semibold mb-1">React Hook Form</h4>
              <p className="text-sm text-gray-600">
                Form state management with validation
              </p>
            </div>
            <div className="border border-gray-200 rounded p-4">
              <div className="text-2xl mb-2">✅</div>
              <h4 className="font-semibold mb-1">Zod Validation</h4>
              <p className="text-sm text-gray-600">
                Type-safe schema validation
              </p>
            </div>
            <div className="border border-gray-200 rounded p-4">
              <div className="text-2xl mb-2">✅</div>
              <h4 className="font-semibold mb-1">shadcn/ui</h4>
              <p className="text-sm text-gray-600">
                Beautiful, accessible components
              </p>
            </div>
            <div className="border border-gray-200 rounded p-4">
              <div className="text-2xl mb-2">✅</div>
              <h4 className="font-semibold mb-1">Toast Notifications</h4>
              <p className="text-sm text-gray-600">
                User feedback with Sonner
              </p>
            </div>
          </div>
        </div>

        {/* Toast Demo Section */}
        <div className="mt-8">
          <ToastDemo />
        </div>
      </main>
    </div>
  );
}
