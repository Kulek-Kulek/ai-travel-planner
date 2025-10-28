"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { getUserTravelProfile } from "@/lib/actions/profile-ai-actions";

export function TravelPersonalityBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed this session
    const dismissed = sessionStorage.getItem('travelProfileBannerDismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check if user has a travel profile
    getUserTravelProfile().then((result) => {
      if (result.success && !result.data) {
        // User is authenticated but doesn't have a profile
        setShowBanner(true);
      }
    });
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('travelProfileBannerDismissed', 'true');
  };

  if (!showBanner || isDismissed) {
    return null;
  }

  return (
    <Card className="relative bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 p-6 mb-6">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-4 pr-8">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Get Personalized Travel Recommendations
          </h3>
          <p className="text-sm text-slate-700 mb-3">
            Take our 2-minute quiz to discover your travel personality. Every future itinerary will be tailored to your unique style!
          </p>
          <Link href="/profile/travel-personality/quiz">
            <Button size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Take the Quiz
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

