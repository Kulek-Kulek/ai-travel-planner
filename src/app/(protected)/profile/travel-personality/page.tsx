import { getUserTravelProfile } from "@/lib/actions/profile-ai-actions";
import { TravelPersonalityDisplay } from "@/components/travel-personality-display";
import { TravelPersonalityQuizCTA } from "@/components/travel-personality-quiz-cta";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/actions/auth-actions";

export default async function TravelPersonalityPage() {
  // Check authentication
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user's travel profile
  const result = await getUserTravelProfile();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Error Loading Profile
            </h2>
            <p className="text-red-700">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  // If no profile exists, show quiz CTA
  if (!result.data) {
    return <TravelPersonalityQuizCTA />;
  }

  // Display the profile
  return <TravelPersonalityDisplay profile={result.data} />;
}

