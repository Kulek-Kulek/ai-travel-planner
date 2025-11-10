"use client";

import { useState } from "react";
import Link from "next/link";
import { TravelQuiz } from "@/components/travel-quiz";
import { generateTravelProfile } from "@/lib/actions/profile-ai-actions";
import type { QuizResponse } from "@/types/travel-profile";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function TravelPersonalityQuizPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleQuizComplete = async (responses: QuizResponse) => {
    setIsGenerating(true);
    
    try {
      const result = await generateTravelProfile(responses);
      
      if (result.success) {
        toast.success("Travel profile created!", {
          description: `Welcome, ${result.data.archetype}!`,
        });
        
        // Redirect to profile page
        router.push("/profile/travel-personality");
      } else {
        toast.error("Failed to create profile", {
          description: result.error,
        });
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("Quiz completion error:", error);
      toast.error("Unexpected error", {
        description: "Please try again or contact support",
      });
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link href="/profile" className="transition-colors text-slate-600 hover:text-slate-900">
                  Profile
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <Link href="/profile/travel-personality" className="transition-colors text-slate-600 hover:text-slate-900">
                  Travel Personality
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Quiz</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Discover Your Travel Personality
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
    </div>
  );
}

