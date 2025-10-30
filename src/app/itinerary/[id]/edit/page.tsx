"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getItinerary } from "@/lib/actions/itinerary-actions";
import { getUserSubscription } from "@/lib/actions/subscription-actions";
import { generateItinerary } from "@/lib/actions/ai-actions";
import type { Itinerary } from "@/lib/actions/itinerary-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import confetti from "canvas-confetti";
import {
  OPENROUTER_MODEL_OPTIONS,
  DEFAULT_OPENROUTER_MODEL,
  type OpenRouterModel,
} from "@/lib/openrouter/models";
import {
  AI_MODELS,
  type SubscriptionTier,
  formatCurrency,
} from "@/lib/config/pricing-models";

export default function EditItineraryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(1);
  const [hasAccessibilityNeeds, setHasAccessibilityNeeds] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_OPENROUTER_MODEL);
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    async function loadData() {
      // Load itinerary
      const itineraryResult = await getItinerary(id);

      if (!itineraryResult.success || !itineraryResult.data) {
        toast.error("Itinerary not found or access denied");
        router.push("/my-plans");
        return;
      }

      // Check ownership - only owner can edit
      if (!itineraryResult.data.user_id) {
        toast.error("Cannot edit anonymous itineraries");
        router.push("/my-plans");
        return;
      }

      setItinerary(itineraryResult.data);
      setDays(itineraryResult.data.days);
      setTravelers(itineraryResult.data.travelers);
      setNotes(itineraryResult.data.notes || "");
      setHasAccessibilityNeeds(itineraryResult.data.has_accessibility_needs || false);

      // Load user subscription info
      const subscriptionInfo = await getUserSubscription();
      if (subscriptionInfo) {
        setUserTier(subscriptionInfo.tier);
      }

      setIsLoading(false);
    }

    loadData();
  }, [id, router]);

  // Cycle through loading messages while regenerating
  useEffect(() => {
    if (!isRegenerating) {
      setLoadingMessage("");
      return;
    }

    const messages = [
      "🔍 Analyzing updated preferences...",
      "🌍 Re-exploring destination...",
      "🎨 Crafting new itinerary...",
      "🗺️ Replanning activities...",
      "✨ Finalizing changes...",
    ];

    let currentIndex = 0;
    setLoadingMessage(messages[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isRegenerating]);

  // Trigger confetti effect for successful edit
  const triggerConfetti = () => {
    const duration = 2500;
    const animationEnd = Date.now() + duration;
    const defaults = { 
      startVelocity: 25, 
      spread: 360, 
      ticks: 60, 
      zIndex: 9999,
      colors: ['#4F46E5', '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B']
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 30 * (timeLeft / duration);
      
      // Center burst - higher on screen
      confetti({
        ...defaults,
        particleCount: particleCount * 0.8,
        origin: { x: 0.5, y: 0.25 }
      });
      
      // Left side confetti
      confetti({
        ...defaults,
        particleCount: particleCount * 0.3,
        origin: { x: 0.25, y: 0.35 }
      });
      
      // Right side confetti
      confetti({
        ...defaults,
        particleCount: particleCount * 0.3,
        origin: { x: 0.75, y: 0.35 }
      });
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itinerary) return;

    // Validation
    if (days < 1 || days > 30) {
      toast.error("Days must be between 1 and 30");
      return;
    }

    if (travelers < 1 || travelers > 20) {
      toast.error("Travelers must be between 1 and 20");
      return;
    }

    setIsRegenerating(true);

    try {
      // Call AI to regenerate the itinerary with new parameters
      const result = await generateItinerary({
        destination: itinerary.destination,
        days,
        travelers,
        hasAccessibilityNeeds,
        notes,
        model: selectedModel as OpenRouterModel, // Use user-selected model
        keepExistingPhoto: true,
        existingPhotoData: {
          image_url: itinerary.image_url,
          image_photographer: itinerary.image_photographer,
          image_photographer_url: itinerary.image_photographer_url,
        },
        existingItineraryId: id,
        operation: 'regenerate',
      });

      if (result.success) {
        // Trigger confetti effect
        triggerConfetti();
        
        toast.success("✅ Itinerary updated successfully!", {
          description:
            "Your plan has been regenerated with your updated preferences",
        });
        // Redirect back to the same itinerary (now updated)
        router.push(`/itinerary/${id}`);
        router.refresh(); // Refresh to show updated data
      } else {
        toast.error("Failed to regenerate itinerary", {
          description: result.error,
        });
        setIsRegenerating(false);
      }
    } catch (error) {
      toast.error("Unexpected error occurred");
      console.error("Regeneration error:", error);
      setIsRegenerating(false);
    }
  };

  // Map OpenRouter model value to pricing model key for tier checking
  const getPricingModelKey = (openRouterValue: string) => {
    const mapping: Record<string, string> = {
      'google/gemini-2.0-flash-lite-001': 'gemini-2.0-flash',
      'openai/gpt-4o-mini': 'gpt-4o-mini',
      'google/gemini-2.5-pro': 'gemini-2.5-pro',
      'anthropic/claude-3-haiku': 'claude-haiku',
      'google/gemini-2.5-flash': 'gemini-2.5-flash',
    };
    return mapping[openRouterValue];
  };

  // Group models by availability
  const availableModels = OPENROUTER_MODEL_OPTIONS.filter((option) => {
    const pricingKey = getPricingModelKey(option.value);
    if (!pricingKey) return false;
    if (!AI_MODELS[pricingKey as keyof typeof AI_MODELS]) return false;
    const pricingModel = AI_MODELS[pricingKey as keyof typeof AI_MODELS];
    return pricingModel.freeAccess || userTier !== 'free';
  });

  const lockedModels = OPENROUTER_MODEL_OPTIONS.filter((option) => {
    const pricingKey = getPricingModelKey(option.value);
    if (!pricingKey) return false;
    if (!AI_MODELS[pricingKey as keyof typeof AI_MODELS]) return false;
    const pricingModel = AI_MODELS[pricingKey as keyof typeof AI_MODELS];
    return !pricingModel.freeAccess && userTier === 'free';
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
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
              <Label
                htmlFor="destination"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
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
                💡 Destination cannot be changed. Want a different destination?
                Create a new itinerary instead.
              </p>
            </div>

            {/* Editable Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Number of Days */}
              <div>
                <Label
                  htmlFor="days"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
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
                <p className="text-sm text-gray-500 mt-1">1-30 days</p>
              </div>

              {/* Number of Travelers */}
              <div>
                <Label
                  htmlFor="travelers"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
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
                <p className="text-sm text-gray-500 mt-1">1-20 travelers</p>
              </div>
            </div>

            {/* Accessibility Needs */}
            <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="accessibility" className="text-base">
                  Accessibility Requirements
                </Label>
                <p className="text-sm text-gray-500">
                  Enable wheelchair access, elevator availability, and other
                  mobility considerations
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
              <Label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
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
                Tell AI about your preferences, interests, dietary needs, or
                special requirements (max 500 characters)
              </p>
            </div>

            {/* AI Model Selection */}
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  AI Settings
                </h3>
                <p className="text-sm text-slate-500">
                  Choose which AI model will regenerate your travel plan.
                </p>
              </div>

              <div className="max-w-sm">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isRegenerating}>
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Available Models */}
                    {availableModels.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Available
                        </div>
                        {availableModels.map((option) => {
                          const pricingKey = getPricingModelKey(option.value);
                          const pricingModel = AI_MODELS[pricingKey as keyof typeof AI_MODELS];
                          return (
                            <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                              <div className="flex items-center justify-between w-full gap-3">
                                <span>{option.label}</span>
                                <div className="flex items-center gap-2">
                                  {pricingModel && (
                                    <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                      {pricingModel.badge}
                                    </span>
                                  )}
                                  {userTier === 'payg' && pricingModel && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatCurrency(pricingModel.cost)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </>
                    )}

                    {/* Locked Models */}
                    {lockedModels.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2 pt-2 flex items-center gap-2">
                          <Lock className="size-3.5" />
                          <span>Premium Models</span>
                        </div>
                        {lockedModels.map((option) => {
                          const pricingKey = getPricingModelKey(option.value);
                          const pricingModel = AI_MODELS[pricingKey as keyof typeof AI_MODELS];
                          return (
                            <SelectItem key={option.value} value={option.value} disabled className="cursor-not-allowed">
                              <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex items-center gap-2">
                                  <Lock className="size-3.5 text-muted-foreground" />
                                  <span className="font-medium">{option.label}</span>
                                </div>
                                {pricingModel && (
                                  <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                    {pricingModel.badge}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Upgrade prompt for locked models */}
              {lockedModels.length > 0 && userTier === 'free' && (
                <div className="mt-4 p-4 border border-blue-200 bg-blue-50/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Lock className="size-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Unlock Premium AI Models
                      </p>
                      <p className="text-xs text-blue-700 mb-2">
                        Access <strong>Claude Haiku</strong> and <strong>GPT-4o</strong> with 
                        Pay-as-you-go ({formatCurrency(0.3)}-{formatCurrency(0.5)} per plan) 
                        or Pro plan ({formatCurrency(9.99)}/month).
                      </p>
                      <Link
                        href="/pricing"
                        className="inline-block text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                      >
                        View Pricing Plans →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Warning Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Important:</strong> Clicking &quot;Regenerate with
                AI&quot; will replace this itinerary with completely new
                AI-generated content. This action cannot be undone.
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
                    {loadingMessage || "✨ Regenerating..."}
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
              <li>Update days, travelers, notes, or AI model above</li>
              <li>AI will regenerate this itinerary with your changes</li>
              <li>Destination stays the same ({itinerary.destination})</li>
              <li>The updated itinerary replaces the current one</li>
              <li>Free tier: 1 edit per plan (this counts as an edit)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
