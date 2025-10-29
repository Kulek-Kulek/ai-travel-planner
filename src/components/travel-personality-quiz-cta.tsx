"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Clock,
  Heart,
  Target,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export function TravelPersonalityQuizCTA() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Hero Card */}
        <Card className="relative overflow-hidden p-8 mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">
                Discover Your Travel Personality
              </h1>
              <p className="text-xl text-slate-600">
                Take our fun 2-minute quiz to unlock AI-powered personalized travel recommendations
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-lg bg-white/80">
                <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">2 min</div>
                <div className="text-xs text-slate-600">Quick & Fun</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/80">
                <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">12</div>
                <div className="text-xs text-slate-600">Simple Questions</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/80">
                <Sparkles className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">AI</div>
                <div className="text-xs text-slate-600">Powered</div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <Link href="/profile/travel-personality/quiz">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  <Sparkles className="w-5 h-5" />
                  Take the Quiz Now
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Discover Your Strengths
                </h3>
                <p className="text-sm text-slate-600">
                  Learn what makes you unique as a traveler and how to leverage your natural travel style
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Personalized Itineraries
                </h3>
                <p className="text-sm text-slate-600">
                  Every trip we plan will match your pace, interests, and travel preferences perfectly
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Pro Tips for You
                </h3>
                <p className="text-sm text-slate-600">
                  Get personalized travel advice tailored to your specific style and preferences
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Better Recommendations
                </h3>
                <p className="text-sm text-slate-600">
                  Our AI considers your profile for activities, dining, and accommodation suggestions
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* What You'll Get */}
        <Card className="p-8 bg-gradient-to-br from-slate-50 to-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">
            What You&apos;ll Discover
          </h2>
          <div className="space-y-3 max-w-2xl mx-auto">
            {[
              'Your unique travel archetype (like "The Culinary Explorer" or "The Strategic Maximizer")',
              'An engaging personality description that captures your travel essence',
              'Detailed preferences for activities, dining, and accommodation',
              'Your travel strengths and what you naturally excel at',
              'Personalized pro tips to make your trips even better',
              'How your personality shapes every itinerary we create for you'
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Final CTA */}
        <div className="text-center mt-8">
          <p className="text-slate-600 mb-4">
            Ready to unlock personalized travel experiences?
          </p>
          <Link href="/profile/travel-personality/quiz">
            <Button size="lg" className="gap-2">
              <Sparkles className="w-5 h-5" />
              Start Your Travel Personality Quiz
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

