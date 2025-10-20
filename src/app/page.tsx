'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ItineraryForm } from '@/components/itinerary-form';
import { ItineraryGallery } from '@/components/itinerary-gallery';
import { generateItinerary } from '@/lib/actions/ai-actions';
import { getUserRole } from '@/lib/auth/admin';
import { toast } from 'sonner';
import Link from 'next/link';

export default function Home() {
  const [result, setResult] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const queryClient = useQueryClient();
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is admin
    getUserRole().then(role => {
      setIsAdmin(role === 'admin');
    });
  }, []);

  // Use TanStack Query mutation for generating itinerary
  const mutation = useMutation({
    mutationFn: generateItinerary,
    onSuccess: (response, variables) => {
      if (response.success) {
        // Show success toast
        toast.success('Itinerary generated and saved!', {
          description: `${variables.days}-day trip to ${response.data.city}`,
          action: {
            label: 'View',
            onClick: () => window.location.href = `/itinerary/${response.data.id}`,
          },
        });

        setResult({
          ...variables,
          aiPlan: response.data,
        });

        // Invalidate queries to refresh gallery and tags
        queryClient.invalidateQueries({ queryKey: ['public-itineraries'] });
        queryClient.invalidateQueries({ queryKey: ['all-tags'] });

        // Auto-scroll to gallery to show the new plan
        setTimeout(() => {
          if (galleryRef.current) {
            galleryRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 500); // Small delay to allow gallery to update
      } else {
        toast.error('Failed to generate itinerary', {
          description: response.error,
        });
      }
    },
    onError: (error) => {
      toast.error('Unexpected error occurred', {
        description: 'Please try again or contact support',
      });
      console.error('Generation error:', error);
    },
  });

  // Cycle through loading messages while generating
  useEffect(() => {
    if (!mutation.isPending) {
      setLoadingMessage('');
      return;
    }

    const messages = [
      '🔍 Analyzing your travel preferences...',
      '🌍 Exploring destination highlights...',
      '🎨 Curating the perfect itinerary...',
      '🗺️ Planning daily activities...',
      '📸 Selecting beautiful destination photos...',
      '✨ Adding final touches...',
    ];

    let currentIndex = 0;
    setLoadingMessage(messages[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [mutation.isPending]);

  const handleSubmit = (data: any) => {
    setResult(null);
    mutation.mutate({
      destination: data.destination,
      days: data.days,
      travelers: data.travelers,
      startDate: data.startDate,
      endDate: data.endDate,
      children: data.children,
      childAges: data.childAges,
      hasAccessibilityNeeds: data.hasAccessibilityNeeds,
      notes: data.notes,
    });
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
            <ItineraryForm onSubmit={handleSubmit} isLoading={mutation.isPending} />
          </div>

          {/* Preview/Result Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">
              Your Itinerary
            </h2>
            
            {!result && !mutation.isPending && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-500">
                  Fill in the form and click Generate to create your personalized travel itinerary
                </p>
              </div>
            )}

            {mutation.isPending && (
              <div className="text-center py-12">
                {/* Travel Animation: Palm trees with plane */}
                <div className="relative h-24 mb-6 flex items-center justify-center">
                  {/* Left Palm Tree */}
                  <div className="absolute left-1/4 text-5xl transform -translate-x-1/2">
                    🌴
                  </div>
                  
                  {/* Plane flying across */}
                  <div className="absolute left-0 text-4xl animate-plane">
                    ✈️
                  </div>
                  
                  {/* Right Palm Tree */}
                  <div className="absolute right-1/4 text-5xl transform translate-x-1/2">
                    🌴
                  </div>
                </div>
                
                {/* Dynamic loading message with fade animation */}
                <div className="min-h-[60px] flex flex-col items-center justify-center">
                  <p className="text-gray-700 font-medium text-lg animate-pulse">
                    {loadingMessage || '✨ AI is creating your perfect itinerary...'}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    This may take 10-20 seconds
                  </p>
                </div>
              </div>
            )}
            
            <style jsx>{`
              @keyframes fly-plane {
                0% {
                  left: 10%;
                  transform: translateY(0) scale(1);
                }
                50% {
                  left: 50%;
                  transform: translateY(-10px) scale(1.2);
                }
                100% {
                  left: 90%;
                  transform: translateY(0) scale(1);
                }
              }
              
              .animate-plane {
                animation: fly-plane 2.5s ease-in-out infinite;
              }
            `}</style>

            {result && !mutation.isPending && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-green-900 mb-2">
                    {result.aiPlan?.city || result.destination}
                  </h3>
                  <p className="text-green-700 text-sm">
                    {result.days} days • {result.travelers} adult{result.travelers > 1 ? 's' : ''}
                    {result.children && result.children > 0 && (
                      <>, {result.children} {result.children === 1 ? 'child' : 'children'}</>
                    )}
                    {result.hasAccessibilityNeeds && <> • ♿ Accessible</>}
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
                <div ref={galleryRef} className="mt-16">
                  <ItineraryGallery isAdmin={isAdmin} />
                </div>
      </main>
    </div>
  );
}
