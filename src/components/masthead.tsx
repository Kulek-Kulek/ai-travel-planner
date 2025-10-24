"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getPublicItineraries } from "@/lib/actions/itinerary-actions";
import type { Itinerary } from "@/lib/actions/itinerary-actions";

type MastheadProps = {
  onPlanTrip: () => void;
};

export function Masthead({ onPlanTrip }: MastheadProps) {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItineraries = async () => {
      setIsLoading(true);
      const result = await getPublicItineraries({ limit: 20 });
      if (result.success && result.data.itineraries.length > 0) {
        // Shuffle and take 5 random itineraries with 3+ days
        const shuffled = [...result.data.itineraries]
          .filter(itinerary => itinerary.days >= 3)
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(5, result.data.itineraries.length));
        setItineraries(shuffled);
      }
      setIsLoading(false);
    };

    fetchItineraries();
  }, []);

  useEffect(() => {
    if (itineraries.length > 1 && !isLoading) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % itineraries.length);
      }, 5000); // Auto-slide every 5 seconds
      return () => clearInterval(interval);
    }
  }, [itineraries.length, isLoading]);

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

      <div className="relative mx-auto flex max-w-7xl flex-col gap-16 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:gap-20 lg:px-8">
        <div className="flex-1 space-y-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur">
            <span className="text-lg">✨</span>
            Smarter planning, happier travels
          </span>

          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Personal itineraries curated by AI, tailored to your travelers
            </h1>
            <p className="max-w-xl text-lg text-indigo-100">
              Discover destinations, balance daily experiences, and delight customers with shareable plans in minutes—not hours of manual research.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onPlanTrip}
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-900 shadow-lg shadow-indigo-950/30 transition hover:shadow-xl hover:shadow-indigo-900/40"
            >
              Plan a trip
            </button>
            <Link
              href="#public-itineraries"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Explore sample itineraries
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                icon: "⚡",
                title: "AI-powered drafting",
                desc: "Capture preferences, accessibility needs, and family details with one guided prompt.",
              },
              {
                icon: "🧭",
                title: "Balanced daily flow",
                desc: "Curate mornings, afternoons, and evenings that feel effortless for every traveler.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <span className="text-2xl" aria-hidden>
                  {feature.icon}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-indigo-100">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <dl className="flex flex-wrap gap-6 text-sm text-indigo-100/80">
            <div>
              <dt className="font-medium text-white">2,300+ itineraries generated</dt>
              <dd>Served across 84 destinations worldwide</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Under 2 minutes</dt>
              <dd>Average time to a polished day-by-day plan</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Team-ready exports</dt>
              <dd>Share instantly with customers or colleagues</dd>
            </div>
          </dl>
        </div>

        <div className="flex-1">
          <div className="relative">
            <div aria-hidden className="absolute inset-0 -translate-y-4 scale-95 rounded-[2.25rem] bg-indigo-500/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur h-[450px] flex flex-col">
              {isLoading || !currentItinerary ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
                    <p className="text-sm text-white/60">Loading trips...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-indigo-100/80">
                    <span>Live preview</span>
                    <span>{currentItinerary.days}-day plan</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold line-clamp-1">{currentItinerary.destination}</h3>
                  <p className="mt-3 text-sm leading-6 text-indigo-100/80 line-clamp-2">
                    {currentItinerary.notes || `A curated ${currentItinerary.days}-day experience for ${currentItinerary.travelers} ${currentItinerary.travelers === 1 ? "traveler" : "travelers"}.`}
                  </p>

                  <ul className="mt-4 space-y-0 text-sm text-indigo-100 flex-1 min-h-0 overflow-hidden">
                    {currentItinerary.ai_plan?.days?.slice(0, 3).map((day, idx) => (
                      <li key={idx} className="flex items-start gap-2 h-14">
                        <span className="mt-0.5 text-lg flex-shrink-0" aria-hidden>
                          {["🌅", "🌤️", "🌙"][idx] || "✨"}
                        </span>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="font-semibold text-white line-clamp-1 h-5">{day.title}</p>
                          <p className="text-indigo-100/80 text-xs line-clamp-2 leading-4 h-8">
                            {day.places?.[0]?.desc || "Explore this destination's highlights"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6 space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                      <span className="rounded-full bg-white/10 px-3 py-2">{currentItinerary.days}-day plan</span>
                      {currentItinerary.travelers && (
                        <span className="rounded-full bg-white/10 px-3 py-2">
                          {currentItinerary.travelers} {currentItinerary.travelers === 1 ? "traveler" : "travelers"}
                        </span>
                      )}
                      {currentItinerary.tags?.[0] && (
                        <span className="rounded-full bg-white/10 px-3 py-2 line-clamp-1">{currentItinerary.tags[0]}</span>
                      )}
                    </div>
                    {currentItinerary.creator_name && (
                      <div className="text-sm text-indigo-100/90">
                        <span className="text-indigo-200/70">by</span>{' '}
                        <span className="font-medium text-white">{currentItinerary.creator_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Navigation Dots */}
                  {itineraries.length > 1 && (
                    <div className="mt-6 flex justify-center gap-3">
                      {itineraries.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => handleDotClick(index)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            index === currentIndex
                              ? "w-8 bg-white"
                              : "w-2 bg-white/40 hover:bg-white/60"
                          }`}
                          aria-label={`Go to trip ${index + 1}`}
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

