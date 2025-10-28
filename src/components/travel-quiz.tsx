"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  ChevronRight,
  ChevronLeft,
  Coffee,
  Moon,
  Sun,
  Loader2
} from "lucide-react";
import type { QuizResponse } from "@/types/travel-profile";

interface TravelQuizProps {
  onComplete: (responses: QuizResponse) => Promise<void>;
  isGenerating?: boolean;
}

export function TravelQuiz({ onComplete, isGenerating = false }: TravelQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Partial<QuizResponse>>({});
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const questions = [
    // Q1: Travel Vibe (Visual cards)
    {
      id: 'travelVibe',
      question: "Pick your travel spirit animal 🦋",
      subtitle: "How do you like to explore?",
      type: 'single-visual',
      options: [
        {
          value: 'chill-explorer',
          emoji: '🧘',
          title: 'The Zen Wanderer',
          desc: 'Slow mornings, coffee, one amazing thing per day'
        },
        {
          value: 'balanced-adventurer',
          emoji: '🎯',
          title: 'The Balanced Explorer',
          desc: 'Mix of adventure and chill, structured but flexible'
        },
        {
          value: 'maximum-experience',
          emoji: '⚡',
          title: 'The Experience Collector',
          desc: 'See it all, do it all, sleep when you\'re home'
        },
        {
          value: 'luxury-relaxation',
          emoji: '👑',
          title: 'The Luxury Lounger',
          desc: 'Premium comfort, curated experiences, zero stress'
        }
      ]
    },

    // Q2: Morning Type
    {
      id: 'morningType',
      question: "When do you come alive? 🌅",
      subtitle: "Energy patterns matter!",
      type: 'single-emoji',
      options: [
        { value: 'night-owl', emoji: '🦉', label: 'Night Owl', desc: 'Mornings are painful, nights are magical' },
        { value: 'flexible', emoji: '🦎', label: 'Chameleon', desc: 'I adapt to the vibe' },
        { value: 'early-bird', emoji: '🐓', label: 'Early Bird', desc: 'Sunrise = best time of day' }
      ]
    },

    // Q3: Social Battery
    {
      id: 'socialBattery',
      question: "What charges your battery? 🔋",
      subtitle: "Honest answer only!",
      type: 'single-emoji',
      options: [
        { value: 'introvert-recharge', emoji: '📚', label: 'Solo Time', desc: 'People drain me, solitude recharges' },
        { value: 'ambivert-balance', emoji: '⚖️', label: 'Balanced', desc: 'Need both social and solo time' },
        { value: 'extrovert-energize', emoji: '🎉', label: 'Social Butterfly', desc: 'People energize me!' }
      ]
    },

    // Q4: Travel Frequency
    {
      id: 'travelFrequency',
      question: "How often do you travel? ✈️",
      type: 'single-emoji',
      options: [
        { value: 'rarely', emoji: '🏠', label: 'Homebody', desc: 'Once a year or less' },
        { value: 'occasionally', emoji: '🎒', label: 'Occasional', desc: '2-3 times a year' },
        { value: 'frequently', emoji: '🌍', label: 'Regular', desc: '4-6 times a year' },
        { value: 'constantly', emoji: '🚀', label: 'Nomad', desc: 'Always on the move' }
      ]
    },

    // Q5: Planning Style
    {
      id: 'planningStyle',
      question: "Your travel planning style? 📋",
      type: 'single-emoji',
      options: [
        { value: 'wing-it', emoji: '🎲', label: 'Wing It', desc: 'Book flight, figure out rest later' },
        { value: 'rough-plan', emoji: '🗺️', label: 'Rough Outline', desc: 'Know where I\'m staying, rest is flexible' },
        { value: 'detailed-itinerary', emoji: '📝', label: 'Detailed Plan', desc: 'Hour-by-hour schedule with backups' },
        { value: 'military-precision', emoji: '⏱️', label: 'Full Control', desc: 'Everything booked, timed, and optimized' }
      ]
    },

    // Q6: Activities You LOVE (Multi-select, max 5)
    {
      id: 'loveThese',
      question: "Pick activities that make you go \"HELL YES!\" 🌟",
      subtitle: "Choose up to 5",
      type: 'multi-emoji',
      max: 5,
      options: [
        { value: 'museums', emoji: '🏛️', label: 'Museums' },
        { value: 'art-galleries', emoji: '🎨', label: 'Art Galleries' },
        { value: 'historical-sites', emoji: '⚔️', label: 'Historical Sites' },
        { value: 'hiking', emoji: '🥾', label: 'Hiking' },
        { value: 'beaches', emoji: '🏖️', label: 'Beach Time' },
        { value: 'water-sports', emoji: '🏄', label: 'Water Sports' },
        { value: 'extreme-sports', emoji: '🪂', label: 'Extreme Sports' },
        { value: 'nightlife', emoji: '🎭', label: 'Nightlife/Clubs' },
        { value: 'food-tours', emoji: '🍜', label: 'Food Tours' },
        { value: 'cooking-classes', emoji: '👨‍🍳', label: 'Cooking Classes' },
        { value: 'shopping', emoji: '🛍️', label: 'Shopping' },
        { value: 'spas', emoji: '💆', label: 'Spas/Wellness' },
        { value: 'photography', emoji: '📸', label: 'Photography' },
        { value: 'wildlife', emoji: '🦁', label: 'Wildlife/Safaris' },
        { value: 'local-markets', emoji: '🏪', label: 'Local Markets' },
        { value: 'street-food', emoji: '🌮', label: 'Street Food' },
        { value: 'wine-tasting', emoji: '🍷', label: 'Wine/Beer Tasting' },
        { value: 'architecture', emoji: '🏰', label: 'Architecture' },
        { value: 'festivals', emoji: '🎪', label: 'Festivals/Events' },
        { value: 'nature', emoji: '🌲', label: 'Nature/National Parks' }
      ]
    },

    // Q7: Deal Breakers (Multi-select, max 3)
    {
      id: 'dealBreaker',
      question: "Travel deal-breakers? 🚫",
      subtitle: "Pick up to 3 things that ruin trips for you",
      type: 'multi-text',
      max: 3,
      options: [
        { value: 'crowds', label: 'Too many tourists/crowds' },
        { value: 'early-starts', label: 'Early morning wake-ups' },
        { value: 'over-planning', label: 'Over-scheduled days' },
        { value: 'no-plan', label: 'No plan/structure' },
        { value: 'bad-food', label: 'Bad food options' },
        { value: 'uncomfortable-beds', label: 'Uncomfortable accommodation' },
        { value: 'long-transits', label: 'Long transportation times' },
        { value: 'tourist-traps', label: 'Tourist traps' },
        { value: 'expensive', label: 'Overpriced experiences' },
        { value: 'boring', label: 'Boring/generic activities' }
      ]
    },

    // Q8: Food Adventure Level
    {
      id: 'foodAdventure',
      question: "Mystery dish arrives. You... 🍽️",
      type: 'single-visual',
      options: [
        {
          value: 'play-safe',
          emoji: '🍕',
          title: 'Play It Safe',
          desc: 'I need to recognize my food, thanks'
        },
        {
          value: 'selective-adventurer',
          emoji: '🥘',
          title: 'Selective Adventurer',
          desc: 'Adventurous but within reason'
        },
        {
          value: 'try-anything',
          emoji: '🐛',
          title: 'Try Anything Once',
          desc: 'If locals eat it, I\'m in'
        }
      ]
    },

    // Q9: Budget Style
    {
      id: 'budgetStyle',
      question: "Your travel spending style? 💰",
      type: 'single-visual',
      options: [
        {
          value: 'backpacker',
          emoji: '🎒',
          title: 'Backpacker Budget',
          desc: 'Hostels, street food, free activities'
        },
        {
          value: 'smart-saver',
          emoji: '🎯',
          title: 'Smart Saver',
          desc: 'Mid-range, value for money, strategic splurges'
        },
        {
          value: 'comfort-seeker',
          emoji: '🏨',
          title: 'Comfort Seeker',
          desc: 'Nice hotels, good restaurants, worth the cost'
        },
        {
          value: 'luxury-lover',
          emoji: '💎',
          title: 'Luxury Lover',
          desc: '5-star everything, premium experiences'
        },
        {
          value: 'sky-is-limit',
          emoji: '👑',
          title: 'Sky\'s the Limit',
          desc: 'Best of the best, money is no object'
        }
      ]
    },

    // Q10: Travel Companions
    {
      id: 'travelingWith',
      question: "Who do you usually travel with? 👥",
      type: 'single-emoji',
      options: [
        { value: 'solo', emoji: '🧍', label: 'Solo', desc: 'Party of one' },
        { value: 'partner', emoji: '💑', label: 'Partner', desc: 'My significant other' },
        { value: 'friends', emoji: '👯', label: 'Friends', desc: 'The squad' },
        { value: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Family', desc: 'With the fam' },
        { value: 'varies', emoji: '🔀', label: 'It Varies', desc: 'Depends on the trip' }
      ]
    },

    // Q11: Dietary Considerations
    {
      id: 'dietaryNeeds',
      question: "Any dietary considerations? 🥗",
      subtitle: "Select all that apply (or skip)",
      type: 'multi-text',
      optional: true,
      options: [
        { value: 'vegetarian', label: 'Vegetarian' },
        { value: 'vegan', label: 'Vegan' },
        { value: 'pescatarian', label: 'Pescatarian' },
        { value: 'gluten-free', label: 'Gluten-free' },
        { value: 'dairy-free', label: 'Dairy-free' },
        { value: 'halal', label: 'Halal' },
        { value: 'kosher', label: 'Kosher' },
        { value: 'allergies', label: 'Food allergies' },
        { value: 'none', label: 'None - I eat everything!' }
      ]
    },

    // Q12: Perfect Day (Open-ended for AI context)
    {
      id: 'perfectDay',
      question: "Describe your perfect travel day in one sentence ✨",
      subtitle: "Help us understand your vibe",
      type: 'text',
      placeholder: "e.g., 'Wake up late, hit a local market, long lunch, sunset from somewhere beautiful, then find a cozy bar'"
    }
  ];

  const currentQ = questions[currentQuestion];
  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleNext = () => {
    // Save current answer
    if (currentQ.type === 'multi-emoji' || currentQ.type === 'multi-text') {
      setResponses(prev => ({ ...prev, [currentQ.id]: selectedOptions }));
      setSelectedOptions([]);
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz complete - submit
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedOptions([]);
    }
  };

  const handleSingleSelect = (value: string) => {
    setResponses(prev => ({ ...prev, [currentQ.id]: value }));
    // Auto-advance after selection for better UX
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }, 300);
  };

  const handleMultiSelect = (value: string) => {
    const max = currentQ.max || 999;
    setSelectedOptions(prev => {
      if (prev.includes(value)) {
        return prev.filter(v => v !== value);
      } else if (prev.length < max) {
        return [...prev, value];
      }
      return prev;
    });
  };

  const handleTextInput = (value: string) => {
    setResponses(prev => ({ ...prev, [currentQ.id]: value }));
  };

  const handleSubmit = async () => {
    const finalResponses = { ...responses } as QuizResponse;
    await onComplete(finalResponses);
  };

  const canProceed = () => {
    if (currentQ.optional) return true;
    
    if (currentQ.type === 'multi-emoji' || currentQ.type === 'multi-text') {
      return selectedOptions.length > 0;
    }
    
    if (currentQ.type === 'text') {
      return responses[currentQ.id] && (responses[currentQ.id] as string).trim().length > 10;
    }
    
    return !!responses[currentQ.id];
  };

  const isLastQuestion = currentQuestion === questions.length - 1;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span className="font-medium">Question {currentQuestion + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}% complete 🎯</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      <Card className="p-6 sm:p-8 shadow-xl">
        {/* Question Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            {currentQ.question}
          </h2>
          {currentQ.subtitle && (
            <p className="text-slate-600">{currentQ.subtitle}</p>
          )}
        </div>

        {/* Answer Options */}
        <div className="mb-8">
          {/* Visual Cards (Large) */}
          {currentQ.type === 'single-visual' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQ.options?.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSingleSelect(option.value)}
                  className={`p-6 rounded-xl border-2 transition-all hover:scale-105 text-left ${
                    responses[currentQ.id] === option.value
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-slate-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="text-4xl mb-3">{option.emoji}</div>
                  <div className="text-lg font-semibold text-slate-900 mb-1">
                    {option.title}
                  </div>
                  <div className="text-sm text-slate-600">{option.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Emoji Buttons (Medium) */}
          {currentQ.type === 'single-emoji' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentQ.options?.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSingleSelect(option.value)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    responses[currentQ.id] === option.value
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="text-3xl mb-2">{option.emoji}</div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {option.label}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Multi-Select Emoji Pills */}
          {currentQ.type === 'multi-emoji' && (
            <div>
              <div className="flex flex-wrap gap-3 justify-center">
                {currentQ.options?.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMultiSelect(option.value)}
                    disabled={!selectedOptions.includes(option.value) && selectedOptions.length >= (currentQ.max || 999)}
                    className={`px-4 py-3 rounded-full border-2 transition-all hover:scale-105 ${
                      selectedOptions.includes(option.value)
                        ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="mr-2">{option.emoji}</span>
                    <span className="font-medium text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-slate-500 mt-4">
                Selected: {selectedOptions.length} / {currentQ.max || '∞'}
              </p>
            </div>
          )}

          {/* Multi-Select Text */}
          {currentQ.type === 'multi-text' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.options?.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMultiSelect(option.value)}
                    disabled={!selectedOptions.includes(option.value) && selectedOptions.length >= (currentQ.max || 999)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedOptions.includes(option.value)
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedOptions.includes(option.value)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                      }`}>
                        {selectedOptions.includes(option.value) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-slate-900 text-sm">
                        {option.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-slate-500 mt-4">
                {currentQ.optional ? 'Optional - ' : ''}Selected: {selectedOptions.length}{currentQ.max ? ` / ${currentQ.max}` : ''}
              </p>
            </div>
          )}

          {/* Text Input */}
          {currentQ.type === 'text' && (
            <div>
              <textarea
                value={(responses[currentQ.id] as string) || ''}
                onChange={(e) => handleTextInput(e.target.value)}
                placeholder={currentQ.placeholder}
                rows={4}
                className="w-full p-4 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <p className="text-sm text-slate-500 mt-2">
                {(responses[currentQ.id] as string)?.length || 0} characters
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentQuestion === 0 || isGenerating}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isGenerating}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating your profile...
              </>
            ) : isLastQuestion ? (
              <>
                <Sparkles className="w-4 h-4" />
                Create My Profile
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

