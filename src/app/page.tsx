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
import { Button } from "@/components/ui/button";

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
  const [progress, setProgress] = useState(0);
  const [progressDirection, setProgressDirection] = useState<1 | -1>(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [userCancelled, setUserCancelled] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const galleryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
      if (cancelledRef.current) {
        // Ignore success if the user cancelled while loading
        cancelledRef.current = false;
        return;
      }
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

        // Fill progress to completion for better perceived performance
        setProgressDirection(1);
        setProgress(100);

        setResult({
          ...variables,
          aiPlan: response.data,
        });

        // Invalidate queries to refresh gallery and tags
        queryClient.invalidateQueries({ queryKey: ["public-itineraries"] });
        queryClient.invalidateQueries({ queryKey: ["all-tags"] });

        // Keep the user on the preview; no auto-scroll
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

  // Staged progress + steps while generating
  useEffect(() => {
    if (!mutation.isPending) {
      setLoadingMessage("");
      setProgress(0);
      setCurrentStep(0);
      setUserCancelled(false);
      return;
    }

    const steps = [
      "Analyzing your preferences",
      "Exploring destination highlights",
      "Curating balanced daily plan",
      "Selecting showcase photos",
      "Adding final touches",
    ];

    setLoadingMessage(steps[0]);
    setCurrentStep(0);
    setProgress(8);

    const interval = setInterval(() => {
      setProgress((p) => {
        let delta = (Math.random() * 3 + 1) * progressDirection; // 1-4 each tick
        let next = p + delta;
        if (next >= 99) {
          next = 99;
          setProgressDirection(-1);
        }
        if (next <= 85) {
          next = 85;
          setProgressDirection(1);
        }
        const stepIndex = next < 96
          ? Math.min(steps.length - 1, Math.floor((next / 100) * steps.length))
          : steps.length - 1;
        setCurrentStep(stepIndex);
        setLoadingMessage(steps[stepIndex]);
        return next;
      });
    }, 350);

    return () => clearInterval(interval);
  }, [mutation.isPending]);

  const handleCancelLoading = () => {
    cancelledRef.current = true;
    setProgress(0);
    setCurrentStep(0);
    setUserCancelled(true);
    setHasSubmitted(false);
    setProgressDirection(1);
  };

  // Open first day by default once result arrives
  useEffect(() => {
    if (result?.aiPlan?.days && result.aiPlan.days.length > 0) {
      setOpenDayIndex(0);
    } else {
      setOpenDayIndex(null);
    }
  }, [result]);

  const handleSubmit = (data: FormData) => {
    setResult(null);
    setHasSubmitted(true);
    setUserCancelled(false);
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
          className="-mt-16 space-y-8"
        >
          {/* Form Section */}
          <div
            className={`self-start rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_40px_100px_-60px_rgba(30,64,175,0.6)] backdrop-blur-lg ${
              mutation.isPending && !userCancelled ? "pointer-events-none opacity-60" : ""
            }`}
            aria-busy={mutation.isPending}
          >
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
          {hasSubmitted && ((mutation.isPending && !userCancelled) || result) && (
            <div
              className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-slate-900">Preview</h2>
                <span
                  aria-live="polite"
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    mutation.isPending && !userCancelled
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {mutation.isPending && !userCancelled ? "Generating" : "Ready to share"}
                </span>
              </div>

              <div className="mt-6 space-y-6">
              {!result && !mutation.isPending && (
                <div className="py-10">
                  <div className="mx-auto max-w-sm text-center">
                    <div className="mx-auto mb-4 size-12 rounded-xl bg-slate-100 text-slate-400 grid place-content-center">🧭</div>
                    <h3 className="text-base font-semibold text-slate-900">Your preview will appear here</h3>
                    <p className="mt-2 text-sm text-slate-500">Tell us about your trip to get a tailored plan with daily highlights.</p>
                  </div>
                </div>
              )}

              {mutation.isPending && !userCancelled && (
                <div role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">Crafting your itinerary…</h3>
                    <span className="text-xs text-slate-500">~10–20s</span>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-indigo-600 transition-[width] duration-300 ease-out"
                        style={{ width: `${Math.min(100, Math.max(progress, 6))}%` }}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.floor(progress)}
                        role="progressbar"
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{loadingMessage || "Getting things ready"}</p>
                  </div>

                  <ul className="mt-4 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                    {['Analyzing your preferences','Exploring destination highlights','Curating balanced daily plan','Selecting showcase photos','Adding final touches'].map((label, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className={`inline-grid size-5 place-content-center rounded-full border ${idx < currentStep ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200'}`}>
                          {idx < currentStep ? '✓' : '•'}
                        </span>
                        <span className={`${idx === currentStep ? 'text-slate-700' : ''}`}>{label}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">You can stop and edit details if needed.</p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={handleCancelLoading}>Stop and edit details</Button>
                    </div>
                  </div>
                </div>
              )}


              {result && !mutation.isPending && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-4">
                    <h3 className="mb-1 text-lg font-semibold text-emerald-900">
                      {result.aiPlan?.city || result.destination}
                    </h3>
                    <p className="text-sm text-emerald-800">
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

                  {/* Daily plan breakdown */}
                  {result.aiPlan?.days?.map((day, dayIndex) => {
                    const isOpen = openDayIndex === dayIndex;
                    const panelId = `day-panel-${dayIndex}`;
                    return (
                      <div
                        key={dayIndex}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 text-left"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => setOpenDayIndex(isOpen ? null : dayIndex)}
                          onKeyDown={(e) => {
                            const key = e.key;
                            const total = result.aiPlan?.days?.length || 0;
                            if (!total) return;
                            if (key === "ArrowDown" || key === "ArrowRight") {
                              e.preventDefault();
                              const next = openDayIndex == null ? 0 : Math.min(total - 1, (openDayIndex as number) + 1);
                              setOpenDayIndex(next);
                              setTimeout(() => dayButtonRefs.current[next]?.focus(), 0);
                            } else if (key === "ArrowUp" || key === "ArrowLeft") {
                              e.preventDefault();
                              const prev = openDayIndex == null ? 0 : Math.max(0, (openDayIndex as number) - 1);
                              setOpenDayIndex(prev);
                              setTimeout(() => dayButtonRefs.current[prev]?.focus(), 0);
                            } else if (key === "Home") {
                              e.preventDefault();
                              setOpenDayIndex(0);
                              setTimeout(() => dayButtonRefs.current[0]?.focus(), 0);
                            } else if (key === "End") {
                              e.preventDefault();
                              const last = total - 1;
                              setOpenDayIndex(last);
                              setTimeout(() => dayButtonRefs.current[last]?.focus(), 0);
                            }
                          }}
                          ref={(el) => {
                            dayButtonRefs.current[dayIndex] = el;
                          }}
                        >
                          <h4 className="font-semibold text-slate-900">{day.title}</h4>
                          <span className="text-xs text-slate-500">
                            {day.places?.length || 0} stop{(day.places?.length || 0) === 1 ? "" : "s"}
                          </span>
                        </button>

                        {isOpen && (
                          <div id={panelId} className="mt-3">
                            {day.places?.map((place, placeIndex) => (
                              <div
                                key={placeIndex}
                                className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                              >
                                <p className="font-medium text-slate-900">{place.name}</p>
                                <p className="text-sm text-slate-500 mt-1">{place.desc}</p>
                                <p className="text-xs text-slate-400 mt-2">⏱️ {place.time}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

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
                        ✅ <strong>Itinerary saved!</strong> You can open the full itinerary or explore more plans below.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button asChild size="lg" className="w-full">
                          <Link href={`/itinerary/${result.aiPlan.id}`}>Open full itinerary</Link>
                        </Button>
                        <Button variant="outline" size="lg" className="w-full" onClick={handlePlanTripScroll}>
                          Plan another trip
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Public Itineraries Gallery */}
        <div id="public-itineraries" ref={galleryRef} className="mt-24">
          <ItineraryGallery isAdmin={isAdmin} />
        </div>
      </main>
    </div>
  );
}
