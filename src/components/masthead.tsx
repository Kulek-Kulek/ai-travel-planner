"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicItineraries } from "@/lib/actions/itinerary-actions";
import { Sparkles, Zap, Compass, Sunrise, Sun, Moon } from "lucide-react";

type MastheadProps = {
  onPlanTrip: () => void;
};

export function Masthead({ onPlanTrip }: MastheadProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Use TanStack Query with the same cache key as the gallery
  const { data: itinerariesData, isLoading } = useQuery({
    queryKey: ['public-itineraries', []], // Same key as gallery uses
    queryFn: async () => {
      const result = await getPublicItineraries({ limit: 20, tags: [] });
      if (!result.success) {
        return { itineraries: [], total: 0 };
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Memoize the carousel itineraries to avoid re-shuffling
  const itineraries = useMemo(() => {
    if (!itinerariesData?.itineraries.length) return [];
    
    // Shuffle and take 5 random itineraries with 3+ days
    return [...itinerariesData.itineraries]
      .filter(itinerary => itinerary.days >= 3)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(5, itinerariesData.itineraries.length));
  }, [itinerariesData]);

  useEffect(() => {
    if (itineraries.length > 1 && !isLoading && !isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % itineraries.length);
      }, 6000); // Auto-slide every 6 seconds (slower, less rushed)
      return () => clearInterval(interval);
    }
  }, [itineraries.length, isLoading, isPaused]);

  const currentItinerary = itineraries[currentIndex];

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-300 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-40 h-72 w-72 rounded-full bg-violet-400/50 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[-4rem] h-80 w-80 rounded-full bg-purple-300/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 pt-6 pb-20 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:pb-24 lg:pt-8">
        <div className="flex-1 space-y-8">
          <div className="space-y-5">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
              Personal itineraries curated by AI, tailored to your travelers
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-indigo-100/90 leading-relaxed">
              Discover destinations, balance daily experiences, and delight customers with shareable plans in minutes—not hours of manual research.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onPlanTrip}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-indigo-900 shadow-lg shadow-indigo-950/30 transition-all hover:shadow-xl hover:shadow-indigo-900/40 w-full sm:w-auto"
            >
              Plan a trip
            </button>
            <Link
              href="#public-itineraries"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/30 px-7 py-3 text-base font-semibold text-white transition-all hover:border-white hover:bg-white/10 w-full sm:w-auto"
            >
              Explore sample itineraries
            </Link>
          </div>

          <div className="pt-6 border-t border-white/10">
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                <dt className="text-2xl font-bold text-white">2,300+</dt>
                <dd className="text-sm text-indigo-100/80">Itineraries generated across 84 destinations</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-2xl font-bold text-white">&lt; 2 min</dt>
                <dd className="text-sm text-indigo-100/80">Average time to a polished day-by-day plan</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-2xl font-bold text-white">100%</dt>
                <dd className="text-sm text-indigo-100/80">Team-ready exports, shareable instantly</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex-1">
          <div className="relative">
            <div aria-hidden className="absolute inset-0 -translate-y-4 scale-95 rounded-[2.25rem] bg-indigo-500/40 blur-2xl" />
            <div 
              className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur h-[480px] flex flex-col transition-all hover:border-white/25"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {isLoading || !currentItinerary ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
                    <p className="text-sm text-white/60">Loading trips...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-indigo-100/70">
                    <span>Live preview</span>
                    <span className="bg-white/10 px-2 py-1 rounded">{currentItinerary.days}d</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-bold line-clamp-1">{currentItinerary.destination}</h3>
                  <p className="mt-3 text-sm leading-6 text-indigo-100/80 line-clamp-2">
                    {currentItinerary.notes || `A curated ${currentItinerary.days}-day experience for ${currentItinerary.travelers} ${currentItinerary.travelers === 1 ? "traveler" : "travelers"}.`}
                  </p>

                  <ul className="mt-4 space-y-2 text-sm text-indigo-100 flex-1 min-h-0 overflow-hidden">
                    {currentItinerary.ai_plan?.days?.slice(0, 3).map((day, idx) => {
                      const DayIcon = [Sunrise, Sun, Moon][idx] || Sparkles;
                      return (
                        <li key={idx} className="flex items-start gap-3 min-h-[60px]">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mt-0.5">
                            <DayIcon className="w-4 h-4 text-white" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-semibold text-white line-clamp-1 mb-1">{day.title}</p>
                            <p className="text-indigo-100/80 text-xs line-clamp-2 leading-relaxed">
                              {day.places?.[0]?.desc || "Explore this destination's highlights"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-auto pt-5 border-t border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded-lg bg-white/10 px-2.5 py-1 text-white/90">{currentItinerary.days}d</span>
                        {currentItinerary.travelers && (
                          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-white/90">
                            {currentItinerary.travelers}p
                          </span>
                        )}
                        {currentItinerary.tags?.[0] && (
                          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-white/90 line-clamp-1 max-w-[120px]">{currentItinerary.tags[0]}</span>
                        )}
                      </div>
                      {currentItinerary.creator_name && (
                        <div className="text-xs text-indigo-100/80 truncate max-w-[140px]">
                          <span className="font-medium text-white">{currentItinerary.creator_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Dots */}
                  {itineraries.length > 1 && (
                    <div className="mt-6 flex justify-center items-center gap-2">
                      {itineraries.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => handleDotClick(index)}
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            index === currentIndex
                              ? "w-10 bg-white shadow-lg shadow-white/50"
                              : "w-2.5 bg-white/40 hover:bg-white/70 hover:scale-125"
                          }`}
                          aria-label={`Go to trip ${index + 1}`}
                          aria-current={index === currentIndex ? "true" : "false"}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

