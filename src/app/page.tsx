"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ItineraryFormAIEnhanced } from "@/components/itinerary-form-ai-enhanced";
import { ItineraryGallery } from "@/components/itinerary-gallery";
import { Masthead } from "@/components/masthead";
import { UpgradeModal } from "@/components/upgrade-modal";
import { TravelPersonalityBanner } from "@/components/travel-personality-banner";
import { generateItinerary } from "@/lib/actions/ai-actions";
import { claimDraftItinerary } from "@/lib/actions/itinerary-actions";
import { getUserRole } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { OpenRouterModel } from "@/lib/openrouter/models";
import { Button } from "@/components/ui/button";
import { Plane, Clock, Lock, CheckCircle2, LogIn, AlertTriangle, Check } from "lucide-react";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [progressDirection, setProgressDirection] = useState<1 | -1>(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [userCancelled, setUserCancelled] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(null);
  const [hasCreatedPlanWhileLoggedOut, setHasCreatedPlanWhileLoggedOut] = useState(false);
  const queryClient = useQueryClient();
  const galleryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const authBannerRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const claimedIdsRef = useRef<Set<string>>(new Set()); // Track claimed itineraries to prevent duplicates

  useEffect(() => {
    // Check if user is admin
    getUserRole().then((role) => {
      setIsAdmin(role === "admin");
    });
  }, []);

  // Check authentication status on mount and listen to auth changes
  useEffect(() => {
    const supabase = createClient();
    
    // Function to handle auth state
    const handleAuthState = (user: any) => {
      const isAuth = !!user;
      setIsAuthenticated(isAuth);
      
      // If user is authenticated, always clear the "created plan while logged out" flags
      if (isAuth) {
        sessionStorage.removeItem('createdPlanWhileLoggedOut');
        sessionStorage.removeItem('draftItineraryId');
        setHasCreatedPlanWhileLoggedOut(false);
        
        // Check if there's a pending bucket list add
        const pendingBucketListAdd = sessionStorage.getItem('pendingBucketListAdd');
        if (pendingBucketListAdd) {
          // Import and execute the add
          import('@/lib/actions/itinerary-actions').then(({ addToBucketList }) => {
            addToBucketList(pendingBucketListAdd).then((result) => {
              if (result.success) {
                toast.success('Added to your bucket list! ❤️');
                // Invalidate queries to refresh bucket list state
                queryClient.invalidateQueries({ queryKey: ['bucket-list-ids'] });
                queryClient.invalidateQueries({ queryKey: ['bucket-list'] });
              }
            });
          });
          // Clear the pending add
          sessionStorage.removeItem('pendingBucketListAdd');
        }
      } else {
        // Only if NOT authenticated, check sessionStorage for previous anonymous session
        const createdPlanWhileLoggedOut = sessionStorage.getItem('createdPlanWhileLoggedOut');
        if (createdPlanWhileLoggedOut === 'true') {
          setHasCreatedPlanWhileLoggedOut(true);
        }
      }
    };
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthState(session?.user ?? null);
    });
    
    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthState(session?.user ?? null);
    });
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Load itinerary from URL param or sessionStorage if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let itineraryId = params.get("itineraryId");
    
    // If not in URL, check sessionStorage for a recently created draft
    if (!itineraryId) {
      const stored = sessionStorage.getItem('draftItineraryId');
      if (stored) {
        itineraryId = stored;
      }
    }
    
    if (itineraryId) {
      // Check if already processing this ID to prevent duplicate claims
      if (claimedIdsRef.current.has(itineraryId)) {
        return;
      }
      
      // Mark as processing immediately before any async operations
      claimedIdsRef.current.add(itineraryId);
      
      const loadItinerary = async () => {
        try {
          const response = await fetch(`/api/itineraries/${itineraryId}`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.data) {
              const itinerary = data.data;
              setResult({
                destination: itinerary.destination,
                days: itinerary.days,
                travelers: itinerary.travelers,
                notes: itinerary.notes,
                children: itinerary.children,
                childAges: itinerary.child_ages,
                hasAccessibilityNeeds: itinerary.has_accessibility_needs,
                aiPlan: itinerary.ai_plan,
                model: "anthropic/claude-3-haiku" as const,
              });
              setHasSubmitted(true);
              
              // If this is a draft, check if user is now authenticated and claim it
              if (itinerary.status === 'draft') {
                const supabase = createClient();
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session?.user) {
                      claimDraftItinerary(itineraryId!).then((result) => {
                        if (result.success) {
                          
                          // Clean up sessionStorage after successful claim
                          sessionStorage.removeItem('createdPlanWhileLoggedOut');
                          sessionStorage.removeItem('draftItineraryId');
                          sessionStorage.removeItem('itineraryId');
                          
                          // Clear all state to re-enable form
                          setResult(null);
                          setHasSubmitted(false);
                          setHasCreatedPlanWhileLoggedOut(false); // Clear this state too!
                          
                          toast.success("Itinerary saved to your account!", {
                            description: "Your travel plan is now permanently saved",
                            action: {
                              label: "View My Plans",
                              onClick: () => window.location.href = "/my-plans",
                            },
                          });
                        
                        // Refresh gallery to show the newly published itinerary
                        queryClient.invalidateQueries({ queryKey: ["public-itineraries"] });
                        queryClient.invalidateQueries({ queryKey: ["my-itineraries"] });
                        
                        // Scroll to gallery
                        setTimeout(() => {
                          if (galleryRef.current) {
                            galleryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }, 300);
                      } else {
                        toast.error('Failed to save itinerary', {
                          description: result.error,
                        });
                      }
                    });
                  }
                });
              }
              
              // Clean up URL but keep draftItineraryId in sessionStorage
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (error) {
          console.error("Failed to load itinerary:", error);
        }
      };
      loadItinerary();
    }
  }, [queryClient]);

  // Auto-scroll to gallery for authenticated users after plan is created
  useEffect(() => {
    if (isAuthenticated && result?.aiPlan?.id && galleryRef.current) {
      // Scroll to gallery instead of showing preview
      setTimeout(() => {
        const galleryTop = galleryRef.current!.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: galleryTop, behavior: "smooth" });
      }, 500);
    }
  }, [isAuthenticated, result]);

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
        toast.success("Itinerary generated!", {
          description: `${variables.days}-day trip to ${response.data.city}`,
          action: {
            label: "View Full Plan",
            onClick: () =>
              (window.location.href = `/itinerary/${response.data.id}`),
          },
        });

        // Fill progress to completion for better perceived performance
        setProgressDirection(1);
        setProgress(100);

        const resultData = {
          ...variables,
          aiPlan: response.data,
        };

        setResult(resultData);

        // Invalidate queries to refresh gallery and tags
        queryClient.invalidateQueries({ queryKey: ["public-itineraries"] });
        queryClient.invalidateQueries({ queryKey: ["all-tags"] });

        // Store state for non-authenticated users
        if (!isAuthenticated) {
          // Mark that this user created a plan while logged out
          sessionStorage.setItem('createdPlanWhileLoggedOut', 'true');
          sessionStorage.setItem('draftItineraryId', response.data.id);
          setHasCreatedPlanWhileLoggedOut(true);
          
          // Scroll to auth banner
          setTimeout(() => {
            if (authBannerRef.current) {
              authBannerRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }, 500);
        }

        // NO auto-redirect - let user see preview first
        // They can click the banner buttons to sign in if needed
      } else {
        // Check if this is a tier limit error
        const errorMessage = response.error || "";
        const isTierLimitError = 
          errorMessage.toLowerCase().includes("limit reached") ||
          errorMessage.toLowerCase().includes("tier limit") ||
          errorMessage.toLowerCase().includes("upgrade");
        
        if (isTierLimitError) {
          // Show upgrade modal instead of toast for limit errors
          setShowUpgradeModal(true);
        } else {
          // Show regular error toast for other errors
          toast.error("Failed to generate itinerary", {
            description: response.error,
          });
        }
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
    // Keep progress bar moving until we have the result AND it's not pending
    const shouldShowProgress = mutation.isPending || (hasSubmitted && !result && !userCancelled);
    
    if (!shouldShowProgress) {
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
        const delta = (Math.random() * 3 + 1) * progressDirection; // 1-4 each tick
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
  }, [mutation.isPending, hasSubmitted, result, userCancelled, progressDirection]);

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
      setOpenDayIndex(0); // Always open first day
    } else {
      setOpenDayIndex(null);
    }
  }, [result]);

  const handleSubmit = (data: FormData) => {
    // Don't allow submission if user already created a plan while logged out
    if (!isAuthenticated && hasCreatedPlanWhileLoggedOut) {
      toast.error("Please sign in first", {
        description: "Create a free account to generate another itinerary",
      });
      return;
    }
    
    setResult(null);
    setHasSubmitted(true);
    setUserCancelled(false);
    
    // Scroll to preview area immediately
    setTimeout(() => {
      if (previewRef.current) {
        previewRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
    
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

  // Handle redirecting to sign-in/sign-up after saving draft
  const handleAuthRedirect = async (authPage: 'sign-in' | 'sign-up') => {
    if (!result || !result.aiPlan) return;
    
    // The itinerary was already saved by generateItinerary
    // Store it in sessionStorage so it persists through navigation
    const itineraryId = result.aiPlan.id;
    sessionStorage.setItem('itineraryId', itineraryId);
    window.location.href = `/${authPage}?itineraryId=${itineraryId}`;
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
              <ItineraryFormAIEnhanced
                onSubmit={handleSubmit}
                isLoading={mutation.isPending}
                modelOverride="anthropic/claude-3.5-haiku"
                isAuthenticated={isAuthenticated}
                hasResult={!!result || hasCreatedPlanWhileLoggedOut}
              />
            </div>
          </div>

          {/* Preview/Result Section */}
          {hasSubmitted && ((mutation.isPending && !userCancelled) || result) && (
            <div
              ref={previewRef}
              className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            >
              {/* Auth Banner - shown when not authenticated and preview is ready */}
              {!isAuthenticated && result && !mutation.isPending && (
                <div 
                  ref={authBannerRef}
                  className="mb-6 rounded-2xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 p-6 shadow-md"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <LogIn className="w-6 h-6 text-indigo-600" />
                        <h3 className="text-xl font-semibold text-slate-900">
                          Sign in to save your itinerary
                        </h3>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Your personalized travel plan is ready! Create a free account to unlock all features:
                      </p>
                      <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>100% Free</strong> – No hidden costs or subscriptions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Quick Setup</strong> – Takes only 30 seconds to create an account</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Full Control</strong> – Edit, update, and regenerate your plans anytime</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span><strong>Save & Share</strong> – Access your itineraries from any device and share with friends</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <span className="text-red-700"><strong>Without an account</strong> – This plan will be lost when you close this page</span>
                        </li>
                      </ul>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button 
                        size="lg" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-shadow"
                        onClick={() => handleAuthRedirect('sign-up')}
                      >
                        <span className="mr-2">✨</span>
                        Create Free Account
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="border-indigo-300 hover:bg-indigo-50"
                        onClick={() => handleAuthRedirect('sign-in')}
                      >
                        Already have an account? Sign in
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
                  {mutation.isPending && !userCancelled ? "Generating" : "Ready"}
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


                {result && !mutation.isPending && !isAuthenticated && (
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
                      const isFirstDay = dayIndex === 0;
                      const isLocked = !isAuthenticated && !isFirstDay;
                      
                      return (
                        <div
                          key={dayIndex}
                          className={`rounded-2xl border border-slate-200 bg-slate-50/70 p-4 ${isLocked ? 'opacity-60' : ''}`}
                        >
                          <div className="space-y-2">
                            <button
                              type="button"
                              className={`flex w-full items-center justify-between gap-3 text-left ${isLocked ? 'cursor-not-allowed' : ''}`}
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              onClick={() => {
                                if (!isLocked) {
                                  setOpenDayIndex(isOpen ? null : dayIndex);
                                }
                              }}
                              disabled={isLocked}
                              onKeyDown={(e) => {
                                if (isLocked) return;
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
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900">{day.title}</h4>
                                {isLocked && (
                                  <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                    <Lock className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                {day.places?.length || 0} stop{(day.places?.length || 0) === 1 ? "" : "s"}
                              </span>
                            </button>
                            
                            {isLocked && (
                              <p className="text-xs text-slate-500 italic pl-2">
                                Sign in to unlock this day
                              </p>
                            )}
                          </div>

                          {isOpen && (
                            <div id={panelId} className="mt-3 relative">
                              {day.places?.map((place, placeIndex) => {
                                // For non-authenticated users on first day, blur bottom half
                                const shouldBlur = !isAuthenticated && isFirstDay && placeIndex >= Math.ceil(day.places.length / 2);
                                
                                return (
                                  <div
                                    key={placeIndex}
                                    className={`mt-3 rounded-xl border-l-4 border-blue-500 bg-white p-5 shadow-sm hover:bg-slate-50 transition-colors ${shouldBlur ? 'blur-[0.5px] select-none pointer-events-none' : ''}`}
                                  >
                                    <div className="flex flex-col md:flex-row items-start gap-4">
                                      {/* Time Badge - Above on mobile, left on desktop */}
                                      <div className="w-full md:w-auto flex-shrink-0">
                                        <div className="bg-blue-600 text-white rounded-lg px-3 py-2 text-center md:min-w-[120px]">
                                          <div className="flex items-center justify-center gap-1 mb-1">
                                            <Clock className="w-4 h-4" />
                                          </div>
                                          <div className="text-sm font-bold leading-tight whitespace-nowrap">
                                            {place.time}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Place Details */}
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                          {place.name}
                                        </h3>
                                        <p className="text-slate-700">{place.desc}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Sign up overlay for first day when not authenticated */}
                              {!isAuthenticated && isFirstDay && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-100 via-slate-50/98 to-transparent pt-16 pb-5 flex items-end justify-center">
                                  <div className="text-center px-8 py-6 rounded-2xl bg-white backdrop-blur-md border border-slate-200 shadow-2xl max-w-xl mx-auto">
                                    {/* Icon and Title */}
                                    <div className="flex items-center justify-center gap-3 mb-4">
                                      <div className="rounded-full bg-blue-600 p-2.5 shadow-md">
                                        <Plane className="w-6 h-6 text-white" />
                                      </div>
                                      <h3 className="text-xl font-bold text-slate-900">
                                        Unlock Your Complete Journey
                                      </h3>
                                    </div>
                                    
                                    {/* Description */}
                                    <p className="text-base text-slate-600 mb-6 leading-relaxed mt-6">
                                      Sign up <span className="font-bold text-blue-600">free</span> to see all <span className="inline-flex items-center justify-center font-bold text-blue-600">{result.aiPlan?.days?.length || 0} days</span> of your personalized itinerary
                                    </p>
                                    
                                    {/* Benefits List */}
                                    <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                                      <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="text-slate-700">Edit & Save</span>
                                      </span>
                                      <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="text-slate-700">Share Plans</span>
                                      </span>
                                      <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="text-slate-700">Download PDF</span>
                                      </span>
                                      <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="text-slate-700">Better AI Models</span>
                                      </span>
                                      <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="text-slate-700">Book Hotels</span>
                                      </span>
                                      <span className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="text-slate-700">Google Maps</span>
                                      </span>
                                    </div>
                                    
                                    {/* CTA Button */}
                                    <Button 
                                      onClick={() => handleAuthRedirect('sign-up')}
                                      className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                      size="lg"
                                    >
                                      <Plane className="w-4 h-4 mr-2" />
                                      Create Free Account
                                    </Button>
                                    
                                    {/* Already have account link */}
                                    <button
                                      onClick={() => handleAuthRedirect('sign-in')}
                                      className="mt-4 text-sm text-slate-600 hover:text-slate-900 font-medium underline"
                                    >
                                      Already have an account? Sign in
                                    </button>
                                  </div>
                                </div>
                              )}
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
                        <p className="text-emerald-800 text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                          <span><strong>Itinerary saved!</strong> You can open the full itinerary or explore more plans below.</span>
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Button size="lg" className="w-full" onClick={() => window.location.href = `/itinerary/${result.aiPlan?.id}`} disabled={!isAuthenticated}>
                            Open full itinerary
                          </Button>
                          <Button variant="outline" size="lg" className="w-full" onClick={handlePlanTripScroll} disabled={!isAuthenticated}>
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

        {/* Travel Personality Banner - Before Gallery */}
        <div className="mt-10 lg:mt-12">
          <TravelPersonalityBanner />
        </div>

        {/* Public Itineraries Gallery */}
        <div id="public-itineraries" ref={galleryRef} className="mt-10">
          <ItineraryGallery isAdmin={isAdmin} />
        </div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  );
}
