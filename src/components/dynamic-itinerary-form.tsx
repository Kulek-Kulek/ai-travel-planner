"use client";

/**
 * Dynamic Itinerary Form
 * 
 * This component automatically selects the appropriate form based on user's subscription tier:
 * - Free users: Regex-based smart form (no AI cost)
 * - Paid users: AI-enhanced form with tier-appropriate model
 */

import { useEffect, useState } from "react";
import { ItineraryForm as SmartForm } from "@/components/itinerary-form-smart";
import { ItineraryFormAIEnhanced } from "@/components/itinerary-form-ai-enhanced";
import { getUserTier } from "@/lib/actions/user-tier-actions";
import { getModelForTier, type UserTier } from "@/lib/config/extraction-models";
import type { ItineraryFormData } from "@/components/itinerary-form-smart";

interface DynamicItineraryFormProps {
  onSubmit: (data: ItineraryFormData) => void;
  isLoading?: boolean;
}

export function DynamicItineraryForm({
  onSubmit,
  isLoading = false,
}: DynamicItineraryFormProps) {
  const [userTier, setUserTier] = useState<UserTier | null>(null);
  const [isLoadingTier, setIsLoadingTier] = useState(true);

  useEffect(() => {
    getUserTier()
      .then((tier) => {
        setUserTier(tier);
        setIsLoadingTier(false);
      })
      .catch((error) => {
        console.error("Error fetching user tier:", error);
        setUserTier("free"); // Default to free on error
        setIsLoadingTier(false);
      });
  }, []);

  // Show loading state
  if (isLoadingTier) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-sm text-slate-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // Free users get regex-based smart form
  if (userTier === "free") {
    return <SmartForm onSubmit={onSubmit} isLoading={isLoading} />;
  }

  // Paid users get AI-enhanced form with tier-appropriate model
  const model = getModelForTier(userTier!);

  return (
    <ItineraryFormAIEnhanced
      onSubmit={onSubmit}
      isLoading={isLoading}
      modelOverride={model}
    />
  );
}

