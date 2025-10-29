"use client";

import { useState } from "react";
import { TravelQuiz } from "@/components/travel-quiz";
import type { QuizResponse } from "@/types/travel-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function TestTravelQuizPage() {
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleQuizComplete = async (responses: QuizResponse) => {
    setIsGenerating(true);
    
    // Call the actual AI profile generation
    const { generateTravelProfile } = await import("@/lib/actions/profile-ai-actions");
    const result = await generateTravelProfile(responses);
    
    if (result.success) {
      setQuizResults(responses);
      setQuizComplete(true);
    } else {
      alert(`Error: ${result.error}`);
    }
    
    setIsGenerating(false);
  };

  const handleReset = () => {
    setQuizComplete(false);
    setQuizResults(null);
  };

  if (quizComplete && quizResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
                <Sparkles className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Quiz Complete! 🎉
              </h1>
              <p className="text-slate-600">
                Here&apos;s what you told us (AI profile generation coming next!)
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-slate-900">Your Responses:</h2>
              <pre className="text-sm text-slate-700 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(quizResults, null, 2)}
              </pre>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  ✨ Next Step: AI Profile Generation
                </h3>
                <p className="text-blue-800 text-sm">
                  These responses will be sent to our AI to generate your personalized travel profile
                  with your archetype, personality description, and tailored recommendations!
                </p>
              </div>

              <Button onClick={handleReset} className="w-full">
                Take Quiz Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          🌍 Discover Your Travel Personality
        </h1>
        <p className="text-lg text-slate-600">
          Take our fun 2-minute quiz to unlock personalized travel recommendations
        </p>
      </div>

      <TravelQuiz 
        onComplete={handleQuizComplete} 
        isGenerating={isGenerating}
      />
    </div>
  );
}

