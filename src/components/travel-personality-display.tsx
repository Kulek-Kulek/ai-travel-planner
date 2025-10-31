"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Heart,
  Zap,
  Target,
  MapPin,
  Utensils,
  BedDouble,
  Users,
  TrendingUp,
  Lightbulb,
  Award,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import type { TravelProfile } from "@/types/travel-profile";
import Link from "next/link";

interface TravelPersonalityDisplayProps {
  profile: TravelProfile;
}

export function TravelPersonalityDisplay({ profile }: TravelPersonalityDisplayProps) {
  // Format confidence score as percentage
  const confidencePercentage = Math.round(profile.confidence_score * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header - Matching Homepage Banner Style */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    Your Travel Personality: {profile.archetype}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Award className="w-3 h-3" />
                      {confidencePercentage}% Match
                    </Badge>
                  </div>
                </div>
                <p className="text-white/90 mb-4 text-base sm:text-lg">
                  {profile.profile_summary}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/profile/travel-personality/quiz">
                    <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 w-full sm:w-auto gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Retake Quiz
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Travel Strengths */}
        {profile.travel_strengths && profile.travel_strengths.length > 0 && (
          <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Your Travel Strengths
              </h2>
            </div>
            <div className="grid gap-3">
              {profile.travel_strengths.map((strength, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-700">{strength}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pro Tips */}
        {profile.pro_tips && profile.pro_tips.length > 0 && (
          <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Pro Tips for You
              </h2>
            </div>
            <div className="grid gap-3">
              {profile.pro_tips.map((tip, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <Zap className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-700">{tip}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Preferences Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-lg rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-rose-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Your Interests
                </h3>
              </div>
              <div className="space-y-2">
                {profile.interests.map((interest, index) => (
                  <div
                    key={index}
                    className="text-sm text-slate-700 flex items-start gap-2"
                  >
                    <span className="text-rose-600 mt-0.5">•</span>
                    <span>{interest}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Activity Preferences */}
          {profile.activity_preferences && profile.activity_preferences.length > 0 && (
            <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-lg rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Favorite Activities
                </h3>
              </div>
              <div className="space-y-2">
                {profile.activity_preferences.map((activity, index) => (
                  <div
                    key={index}
                    className="text-sm text-slate-700 flex items-start gap-2"
                  >
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{activity}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Dining Preferences */}
          {profile.dining_preferences && profile.dining_preferences.length > 0 && (
            <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-lg rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Utensils className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Dining Style
                </h3>
              </div>
              <div className="space-y-2">
                {profile.dining_preferences.map((pref, index) => (
                  <div
                    key={index}
                    className="text-sm text-slate-700 flex items-start gap-2"
                  >
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>{pref}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Accommodation Preferences */}
          {profile.accommodation_preferences && profile.accommodation_preferences.length > 0 && (
            <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-lg rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <BedDouble className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Accommodation Style
                </h3>
              </div>
              <div className="space-y-2">
                {profile.accommodation_preferences.map((pref, index) => (
                  <div
                    key={index}
                    className="text-sm text-slate-700 flex items-start gap-2"
                  >
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>{pref}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Social Preferences */}
          {profile.social_preferences && profile.social_preferences.length > 0 && (
            <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-lg rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Social Style
                </h3>
              </div>
              <div className="space-y-2">
                {profile.social_preferences.map((pref, index) => (
                  <div
                    key={index}
                    className="text-sm text-slate-700 flex items-start gap-2"
                  >
                    <span className="text-indigo-600 mt-0.5">•</span>
                    <span>{pref}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Core Travel Style */}
          <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Travel Details
              </h3>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span><span className="font-medium">Style:</span> {profile.travel_style}</span>
              </div>
              <div className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span><span className="font-medium">Pace:</span> {profile.pace}</span>
              </div>
              <div className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">•</span>
                <span><span className="font-medium">Budget:</span> {profile.budget_band}</span>
              </div>
              {profile.dietary_needs && profile.dietary_needs.length > 0 && profile.dietary_needs[0] !== 'none' && (
                <div className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span><span className="font-medium">Dietary:</span> {profile.dietary_needs.join(', ')}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* How This Helps */}
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                How Your Profile Powers Your Itineraries
              </h3>
              <p className="text-slate-700 mb-4">
                Every itinerary we generate for you will be tailored to match your travel personality. 
                We&apos;ll consider your pace, interests, dining preferences, and social style to create 
                trips that feel like they were designed by someone who truly knows you.
              </p>
              <Link href="/">
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Sparkles className="w-4 h-4" />
                  Create Your Personalized Itinerary
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Profile Created Date */}
        <div className="text-center text-sm text-slate-500">
          Profile created: {new Date(profile.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>
    </div>
  );
}
