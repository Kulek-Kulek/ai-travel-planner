"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Compass, RefreshCw, LogIn } from "lucide-react";
import Link from "next/link";
import { getUserTravelProfile } from "@/lib/actions/profile-ai-actions";
import { getUser } from "@/lib/actions/auth-actions";

type BannerState = 'loading' | 'not-authenticated' | 'no-profile' | 'has-profile' | 'dismissed';

interface TravelProfile {
  archetype: string;
}

export function TravelPersonalityBanner() {
  const [bannerState, setBannerState] = useState<BannerState>('loading');
  const [profile, setProfile] = useState<TravelProfile | null>(null);

  useEffect(() => {
    const checkUserAndProfile = async () => {
      // Check if user has already dismissed this session
      const dismissed = sessionStorage.getItem('travelProfileBannerDismissed');
      if (dismissed === 'true') {
        setBannerState('dismissed');
        return;
      }

      // Check authentication
      const user = await getUser();
      
      if (!user) {
        // Not authenticated - show signup CTA
        setBannerState('not-authenticated');
        return;
      }

      // User is authenticated, check for profile
      const result = await getUserTravelProfile();
      
      if (result.success && result.data) {
        // Has profile - show archetype with retake option
        setProfile(result.data);
        setBannerState('has-profile');
      } else {
        // No profile - encourage taking quiz
        setBannerState('no-profile');
      }
    };

    checkUserAndProfile();
  }, []);

  if (bannerState === 'loading' || bannerState === 'dismissed') {
    return null;
  }

  // Not authenticated - Signup CTA
  if (bannerState === 'not-authenticated') {
    return (
      <div className="mb-8 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 sm:p-0 lg:pr-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Discover Your Travel Personality!
              </h2>
              <p className="text-white/90 mb-4 text-base sm:text-lg">
                Sign up for free and take our fun 2-minute quiz. Get AI-powered, personalized travel recommendations that match your unique style!
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Free Forever</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>AI-Powered Insights</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Personalized Itineraries</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" variant="secondary" asChild className="shadow-lg w-full sm:w-auto">
                  <Link href="/sign-up">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign Up Free
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="bg-white/10 hover:bg-white/20 text-white border-white/30 w-full sm:w-auto">
                  <Link href="/sign-in">
                    Already have an account?
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No profile - Take quiz CTA
  if (bannerState === 'no-profile') {
    return (
      <div className="mb-8 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-xl overflow-hidden pr-0 lg:pr-20 relative">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Compass className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 sm:p-0 lg:pr-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Unlock Personalized Travel Experiences
              </h2>
              <p className="text-white/90 mb-4 text-base sm:text-lg">
                Take our fun 2-minute quiz to discover your unique travel personality and get AI-powered recommendations tailored just for you!
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>AI-Powered Insights</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Personalized Itineraries</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Expert Travel Tips</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" variant="secondary" asChild className="shadow-lg w-full sm:w-auto">
                  <Link href="/profile/travel-personality/quiz">
                    Take the Quiz Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="bg-white/10 hover:bg-white/20 text-white border-white/30 w-full sm:w-auto">
                  <Link href="/profile/travel-personality">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has profile - Show archetype with retake option
  if (bannerState === 'has-profile' && profile) {
    return (
      <div className="mb-8 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-xl overflow-hidden pr-0 lg:pr-20 relative">

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 sm:p-0 lg:pr-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Your Travel Personality: {profile.archetype}
              </h2>
              <p className="text-white/90 mb-4 text-base sm:text-lg">
                Your AI-powered travel profile is active and personalizing your itineraries. Want to update your preferences? Retake the quiz anytime!
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Active Profile</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Personalized Itineraries</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Custom Recommendations</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" variant="secondary" asChild className="shadow-lg w-full sm:w-auto">
                  <Link href="/profile/travel-personality">
                    View Full Profile
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="bg-white/10 hover:bg-white/20 text-white border-white/30 w-full sm:w-auto">
                  <Link href="/profile/travel-personality/quiz">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake Quiz
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

