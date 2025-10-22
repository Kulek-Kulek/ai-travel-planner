"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ItineraryForm } from "@/components/itinerary-form";
import { ItineraryGallery } from "@/components/itinerary-gallery";
import { Masthead } from "@/components/masthead";
import { generateItinerary } from "@/lib/actions/ai-actions";
import { getUserRole } from "@/lib/auth/admin";
import { toast } from "sonner";
import Link from "next/link";
import type { OpenRouterModel } from "@/lib/openrouter/models";

type FormData = {
  destination: string;
  days: number;
  travelers: number;
  startDate?: Date;
  endDate?: Date;
  children?: number;
  childAges?: number[];
  hasAccessibilityNeeds?: boolean;
  notes?: string;
  model: OpenRouterModel;
};

type ResultData = FormData & {
  aiPlan?: {
    id: string;
    city: string;
    days: Array<{
      title: string;
      places: Array<{
        name: string;
        desc: string;
        time: string;
      }>;
    }>;
    tags?: string[];
  };
};

export default function Home() {
  const [result, setResult] = useState<ResultData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const queryClient = useQueryClient();
  const galleryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is admin
    getUserRole().then((role) => {
      setIsAdmin(role === "admin");
    });
  }, []);

  // Use TanStack Query mutation for generating itinerary
  const mutation = useMutation({
    mutationFn: generateItinerary,
    onSuccess: (response, variables) => {
      if (response.success) {
        // Show success toast
        toast.success("Itinerary generated and saved!", {
          description: `${variables.days}-day trip to ${response.data.city}`,
          action: {
            label: "View",
            onClick: () =>
              (window.location.href = `/itinerary/${response.data.id}`),
          },
        });

        setResult({
          ...variables,
          aiPlan: response.data,
        });

        // Invalidate queries to refresh gallery and tags
        queryClient.invalidateQueries({ queryKey: ["public-itineraries"] });
        queryClient.invalidateQueries({ queryKey: ["all-tags"] });

        // Auto-scroll to gallery to show the new plan
        setTimeout(() => {
          if (galleryRef.current) {
            galleryRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 500); // Small delay to allow gallery to update
      } else {
        toast.error("Failed to generate itinerary", {
          description: response.error,
        });
      }
    },
    onError: (error) => {
      toast.error("Unexpected error occurred", {
        description: "Please try again or contact support",
      });
      console.error("Generation error:", error);
    },
  });

  // Cycle through loading messages while generating
  useEffect(() => {
    if (!mutation.isPending) {
      setLoadingMessage("");
      return;
    }

    const messages = [
      "🔍 Analyzing your travel preferences...",
      "🌍 Exploring destination highlights...",
      "🎨 Curating the perfect itinerary...",
      "🗺️ Planning daily activities...",
      "📸 Selecting beautiful destination photos...",
      "✨ Adding final touches...",
    ];

    let currentIndex = 0;
    setLoadingMessage(messages[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [mutation.isPending]);

  const handleSubmit = (data: FormData) => {
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
      model: data.model,
    });
  };

  const handlePlanTripScroll = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Masthead onPlanTrip={handlePlanTripScroll} />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        {/* Form and Preview Section */}
        <div
          ref={formRef}
          className="-mt-16 grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr]"
        >
          {/* Form Section */}
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_40px_100px_-60px_rgba(30,64,175,0.6)] backdrop-blur-lg">
            <h2 className="text-2xl font-semibold text-slate-900">
              Create an itinerary
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tell us about the travelers, and we’ll draft a balanced plan with
              signature experiences.
            </p>

            <div className="mt-5">
              <ItineraryForm
                onSubmit={handleSubmit}
                isLoading={mutation.isPending}
              />
            </div>
          </div>

          {/* Preview/Result Section */}
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_45px_90px_-70px_rgba(15,23,42,0.5)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-slate-900">Preview</h2>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {mutation.isPending
                  ? "Generating"
                  : result
                    ? "Ready to share"
                    : "Awaiting details"}
              </span>
            </div>

            {!result && !mutation.isPending && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-500">
                  Fill in the form and click Generate to create your
                  personalized travel itinerary
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
                  <p className="text-indigo-900 font-medium text-lg animate-pulse">
                    {loadingMessage ||
                      "✨ AI is creating your perfect itinerary..."}
                  </p>
                  <p className="text-indigo-900/60 text-sm mt-2">
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
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <h3 className="text-lg font-semibold text-emerald-900 mb-1">
                    {result.aiPlan?.city || result.destination}
                  </h3>
                  <p className="text-emerald-800 text-sm">
                    {result.days} days • {result.travelers} adult
                    {result.travelers > 1 ? "s" : ""}
                    {result.children && result.children > 0 && (
                      <>
                        , {result.children}{" "}
                        {result.children === 1 ? "child" : "children"}
                      </>
                    )}
                    {result.hasAccessibilityNeeds && <> • ♿ Accessible</>}
                  </p>
                </div>

                {/* Show first 2 days as preview */}
                {result.aiPlan?.days?.slice(0, 2).map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <h4 className="font-semibold text-slate-900">
                      {day.title}
                    </h4>

                    {day.places?.slice(0, 3).map((place, placeIndex) => (
                      <div
                        key={placeIndex}
                        className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <p className="font-medium text-slate-900">
                          {place.name}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {place.desc}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          ⏱️ {place.time}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}

                {result.aiPlan?.days && result.aiPlan.days.length > 2 && (
                  <p className="text-sm text-slate-500 text-center">
                    + {result.aiPlan.days.length - 2} more days...
                  </p>
                )}

                {result.aiPlan?.tags && result.aiPlan.tags.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      🏷️ Tags:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.aiPlan.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-block rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.aiPlan?.id && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                    <p className="text-emerald-800 text-sm">
                      ✅ <strong>Itinerary saved!</strong> View your full
                      itinerary or browse more plans below.
                    </p>
                    <Link
                      href={`/itinerary/${result.aiPlan.id}`}
                      className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline"
                    >
                      View Full Itinerary →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Public Itineraries Gallery */}
        <div id="public-itineraries" ref={galleryRef} className="mt-24">
          <ItineraryGallery isAdmin={isAdmin} />
        </div>
      </main>
    </div>
  );
}
