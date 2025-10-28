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
  Loader2,
  Heart,
  Zap,
  Crown,
  Compass,
  Clock,
  Users,
  Calendar,
  Map,
  Target,
  ThumbsUp,
  ThumbsDown,
  Utensils,
  DollarSign,
  Edit2,
  CheckCircle2,
  Palmtree,
  Mountain,
  Building2,
  Waves,
  Flame,
  Leaf,
  Star,
  Gift,
  Camera,
  ShoppingBag,
  Music,
  Landmark,
  Plane,
  Home,
  BedDouble,
  AlertCircle
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
  const [showSummary, setShowSummary] = useState(false);

  const questions = [
    // Q1: Travel Vibe (Visual cards)
    {
      id: 'travelVibe',
      question: "Pick your travel spirit",
      subtitle: "How do you like to explore?",
      type: 'single-visual',
      options: [
        {
          value: 'chill-explorer',
          icon: Palmtree,
          title: 'The Zen Wanderer',
          desc: 'Slow mornings, coffee, one amazing thing per day'
        },
        {
          value: 'balanced-adventurer',
          icon: Target,
          title: 'The Balanced Explorer',
          desc: 'Mix of adventure and chill, structured but flexible'
        },
        {
          value: 'maximum-experience',
          icon: Zap,
          title: 'The Experience Collector',
          desc: 'See it all, do it all, sleep when you\'re home'
        },
        {
          value: 'luxury-relaxation',
          icon: Crown,
          title: 'The Luxury Lounger',
          desc: 'Premium comfort, curated experiences, zero stress'
        }
      ]
    },

    // Q2: Morning Type
    {
      id: 'morningType',
      question: "When do you come alive?",
      subtitle: "Energy patterns matter!",
      type: 'single-icon',
      options: [
        { value: 'night-owl', icon: Moon, label: 'Night Owl', desc: 'Mornings are painful, nights are magical' },
        { value: 'flexible', icon: Coffee, label: 'Chameleon', desc: 'I adapt to the vibe' },
        { value: 'early-bird', icon: Sun, label: 'Early Bird', desc: 'Sunrise = best time of day' }
      ]
    },

    // Q3: Social Battery
    {
      id: 'socialBattery',
      question: "What charges your battery?",
      subtitle: "Honest answer only!",
      type: 'single-icon',
      options: [
        { value: 'introvert-recharge', icon: Heart, label: 'Solo Time', desc: 'People drain me, solitude recharges' },
        { value: 'ambivert-balance', icon: Target, label: 'Balanced', desc: 'Need both social and solo time' },
        { value: 'extrovert-energize', icon: Users, label: 'Social Butterfly', desc: 'People energize me!' }
      ]
    },

    // Q4: Travel Frequency
    {
      id: 'travelFrequency',
      question: "How often do you travel?",
      type: 'single-icon',
      options: [
        { value: 'rarely', icon: Home, label: 'Homebody', desc: 'Once a year or less' },
        { value: 'occasionally', icon: Calendar, label: 'Occasional', desc: '2-3 times a year' },
        { value: 'frequently', icon: Plane, label: 'Regular', desc: '4-6 times a year' },
        { value: 'constantly', icon: Compass, label: 'Nomad', desc: 'Always on the move' }
      ]
    },

    // Q5: Planning Style
    {
      id: 'planningStyle',
      question: "Your travel planning style?",
      type: 'single-icon',
      options: [
        { value: 'wing-it', icon: Compass, label: 'Wing It', desc: 'Book flight, figure out rest later' },
        { value: 'rough-plan', icon: Map, label: 'Rough Outline', desc: 'Know where I\'m staying, rest is flexible' },
        { value: 'detailed-itinerary', icon: Calendar, label: 'Detailed Plan', desc: 'Hour-by-hour schedule with backups' },
        { value: 'military-precision', icon: Clock, label: 'Full Control', desc: 'Everything booked, timed, and optimized' }
      ]
    },

    // Q6: Activities You LOVE (Multi-select, max 5)
    {
      id: 'loveThese',
      question: "Pick activities that make you go 'HELL YES!'",
      subtitle: "Choose up to 5",
      type: 'multi-icon',
      max: 5,
      options: [
        { value: 'museums', icon: Landmark, label: 'Museums' },
        { value: 'art-galleries', icon: Sparkles, label: 'Art Galleries' },
        { value: 'historical-sites', icon: Building2, label: 'Historical Sites' },
        { value: 'hiking', icon: Mountain, label: 'Hiking' },
        { value: 'beaches', icon: Waves, label: 'Beach Time' },
        { value: 'water-sports', icon: Waves, label: 'Water Sports' },
        { value: 'extreme-sports', icon: Flame, label: 'Extreme Sports' },
        { value: 'nightlife', icon: Music, label: 'Nightlife/Clubs' },
        { value: 'food-tours', icon: Utensils, label: 'Food Tours' },
        { value: 'cooking-classes', icon: Utensils, label: 'Cooking Classes' },
        { value: 'shopping', icon: ShoppingBag, label: 'Shopping' },
        { value: 'spas', icon: Heart, label: 'Spas/Wellness' },
        { value: 'photography', icon: Camera, label: 'Photography' },
        { value: 'wildlife', icon: Leaf, label: 'Wildlife/Safaris' },
        { value: 'local-markets', icon: ShoppingBag, label: 'Local Markets' },
        { value: 'street-food', icon: Utensils, label: 'Street Food' },
        { value: 'wine-tasting', icon: Gift, label: 'Wine/Beer Tasting' },
        { value: 'architecture', icon: Building2, label: 'Architecture' },
        { value: 'festivals', icon: Music, label: 'Festivals/Events' },
        { value: 'nature', icon: Mountain, label: 'Nature/National Parks' }
      ]
    },

    // Q7: Deal Breakers (Multi-select, max 3)
    {
      id: 'dealBreaker',
      question: "Travel deal-breakers?",
      subtitle: "Pick up to 3 things that ruin trips for you",
      type: 'multi-text',
      max: 3,
      options: [
        { value: 'crowds', label: 'Too many tourists/crowds', icon: Users },
        { value: 'early-starts', label: 'Early morning wake-ups', icon: Sun },
        { value: 'over-planning', label: 'Over-scheduled days', icon: Calendar },
        { value: 'no-plan', label: 'No plan/structure', icon: AlertCircle },
        { value: 'bad-food', label: 'Bad food options', icon: Utensils },
        { value: 'uncomfortable-beds', label: 'Uncomfortable accommodation', icon: BedDouble },
        { value: 'long-transits', label: 'Long transportation times', icon: Clock },
        { value: 'tourist-traps', label: 'Tourist traps', icon: Target },
        { value: 'expensive', label: 'Overpriced experiences', icon: DollarSign },
        { value: 'boring', label: 'Boring/generic activities', icon: ThumbsDown }
      ]
    },

    // Q8: Food Adventure Level
    {
      id: 'foodAdventure',
      question: "Mystery dish arrives. You...",
      type: 'single-visual',
      options: [
        {
          value: 'play-safe',
          icon: ThumbsUp,
          title: 'Play It Safe',
          desc: 'I need to recognize my food, thanks'
        },
        {
          value: 'selective-adventurer',
          icon: Target,
          title: 'Selective Adventurer',
          desc: 'Adventurous but within reason'
        },
        {
          value: 'try-anything',
          icon: Zap,
          title: 'Try Anything Once',
          desc: 'If locals eat it, I\'m in'
        }
      ]
    },

    // Q9: Budget Style
    {
      id: 'budgetStyle',
      question: "Your travel spending style?",
      type: 'single-visual',
      options: [
        {
          value: 'backpacker',
          icon: Compass,
          title: 'Backpacker Budget',
          desc: 'Hostels, street food, free activities'
        },
        {
          value: 'smart-saver',
          icon: Target,
          title: 'Smart Saver',
          desc: 'Mid-range, value for money, strategic splurges'
        },
        {
          value: 'comfort-seeker',
          icon: BedDouble,
          title: 'Comfort Seeker',
          desc: 'Nice hotels, good restaurants, worth the cost'
        },
        {
          value: 'luxury-lover',
          icon: Crown,
          title: 'Luxury Lover',
          desc: '5-star everything, premium experiences'
        },
        {
          value: 'sky-is-limit',
          icon: Star,
          title: 'Sky\'s the Limit',
          desc: 'Best of the best, money is no object'
        }
      ]
    },

    // Q10: Travel Companions
    {
      id: 'travelingWith',
      question: "Who do you usually travel with?",
      type: 'single-icon',
      options: [
        { value: 'solo', icon: Users, label: 'Solo', desc: 'Party of one' },
        { value: 'partner', icon: Heart, label: 'Partner', desc: 'My significant other' },
        { value: 'friends', icon: Users, label: 'Friends', desc: 'The squad' },
        { value: 'family', icon: Users, label: 'Family', desc: 'With the fam' },
        { value: 'varies', icon: Compass, label: 'It Varies', desc: 'Depends on the trip' }
      ]
    },

    // Q11: Dietary Considerations
    {
      id: 'dietaryNeeds',
      question: "Any dietary considerations?",
      subtitle: "Select all that apply (or skip)",
      type: 'multi-text',
      optional: true,
      options: [
        { value: 'vegetarian', label: 'Vegetarian', icon: Leaf },
        { value: 'vegan', label: 'Vegan', icon: Leaf },
        { value: 'pescatarian', label: 'Pescatarian', icon: Waves },
        { value: 'gluten-free', label: 'Gluten-free', icon: AlertCircle },
        { value: 'dairy-free', label: 'Dairy-free', icon: AlertCircle },
        { value: 'halal', label: 'Halal', icon: CheckCircle2 },
        { value: 'kosher', label: 'Kosher', icon: CheckCircle2 },
        { value: 'allergies', label: 'Food allergies', icon: AlertCircle },
        { value: 'none', label: 'None - I eat everything!', icon: ThumbsUp }
      ]
    },

    // Q12: Perfect Day (Changed to closed question)
    {
      id: 'perfectDay',
      question: "Your ideal travel day looks like...",
      subtitle: "Pick the scenario that resonates most",
      type: 'single-visual',
      options: [
        {
          value: 'slow-foodie',
          icon: Utensils,
          title: 'The Foodie Day',
          desc: 'Sleep in, local market breakfast, cooking class, long lunch, sunset dinner at hidden gem'
        },
        {
          value: 'adventure-packed',
          icon: Mountain,
          title: 'The Adventure Day',
          desc: 'Early hike, adrenaline activity, quick lunch, explore, sundowner at viewpoint'
        },
        {
          value: 'culture-deep-dive',
          icon: Landmark,
          title: 'The Culture Day',
          desc: 'Museum morning, historic walking tour, local lunch, art gallery, traditional show'
        },
        {
          value: 'relaxed-explorer',
          icon: Compass,
          title: 'The Wanderer Day',
          desc: 'Late start, coffee shop, wander neighborhoods, spontaneous stops, cozy bar evening'
        },
        {
          value: 'luxury-leisure',
          icon: Crown,
          title: 'The Indulgence Day',
          desc: 'Spa morning, elegant brunch, curated shopping, rooftop cocktails, fine dining'
        },
        {
          value: 'balanced-mix',
          icon: Target,
          title: 'The Best of Both',
          desc: 'One major sight, good meal, free time to explore, mix of planned and spontaneous'
        }
      ]
    }
  ];

  const currentQ = questions[currentQuestion];
  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleNext = () => {
    // Save current answer
    if (currentQ.type === 'multi-icon' || currentQ.type === 'multi-text') {
      setResponses(prev => ({ ...prev, [currentQ.id]: selectedOptions }));
      setSelectedOptions([]);
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Show summary instead of submitting immediately
      setShowSummary(true);
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
      } else {
        setShowSummary(true);
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

  const handleEditQuestion = (questionIndex: number) => {
    setShowSummary(false);
    setCurrentQuestion(questionIndex);
  };

  const handleSubmit = async () => {
    const finalResponses = { ...responses } as QuizResponse;
    await onComplete(finalResponses);
  };

  const canProceed = () => {
    if (currentQ.optional) return true;
    
    if (currentQ.type === 'multi-icon' || currentQ.type === 'multi-text') {
      return selectedOptions.length > 0;
    }
    
    return !!responses[currentQ.id];
  };

  const isLastQuestion = currentQuestion === questions.length - 1;

  // Summary/Review View
  if (showSummary) {
    const getAnswerDisplay = (questionId: string) => {
      const question = questions.find(q => q.id === questionId);
      const answer = responses[questionId];
      
      if (!answer) return 'Not answered';
      
      if (Array.isArray(answer)) {
        if (answer.length === 0) return 'Skipped';
        return answer.map(val => {
          const option = question?.options?.find(opt => opt.value === val);
          return option?.label || val;
        }).join(', ');
      }
      
      const option = question?.options?.find(opt => opt.value === answer);
      return option?.title || option?.label || answer as string;
    };

    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Card className="p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Review Your Answers
            </h2>
            <p className="text-slate-600">
              Check your responses before we create your travel profile
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="flex items-start justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 mb-1">
                    {index + 1}. {q.question}
                  </div>
                  <div className="text-sm text-slate-600">
                    {getAnswerDisplay(q.id)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditQuestion(index)}
                  className="ml-4 gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setShowSummary(false)}
              disabled={isGenerating}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Questions
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isGenerating}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating your profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create My Profile
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Question View
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span className="font-medium">Question {currentQuestion + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}% complete</span>
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
              {currentQ.options?.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect(option.value)}
                    className={`p-6 rounded-xl border-2 transition-all hover:scale-105 text-left ${
                      responses[currentQ.id] === option.value
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="mb-3">
                      <IconComponent className="w-10 h-10 text-blue-600" />
                    </div>
                    <div className="text-lg font-semibold text-slate-900 mb-1">
                      {option.title}
                    </div>
                    <div className="text-sm text-slate-600">{option.desc}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Icon Buttons (Medium) */}
          {currentQ.type === 'single-icon' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentQ.options?.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                      responses[currentQ.id] === option.value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="mb-2">
                      <IconComponent className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="font-semibold text-slate-900 text-sm">
                      {option.label}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{option.desc}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi-Select Icon Pills */}
          {currentQ.type === 'multi-icon' && (
            <div>
              <div className="flex flex-wrap gap-3 justify-center">
                {currentQ.options?.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleMultiSelect(option.value)}
                      disabled={!selectedOptions.includes(option.value) && selectedOptions.length >= (currentQ.max || 999)}
                      className={`px-4 py-3 rounded-full border-2 transition-all hover:scale-105 flex items-center gap-2 ${
                        selectedOptions.includes(option.value)
                          ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="font-medium text-sm">{option.label}</span>
                    </button>
                  );
                })}
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
                {currentQ.options?.map((option) => {
                  const IconComponent = option.icon;
                  return (
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
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedOptions.includes(option.value)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-300'
                        }`}>
                          {selectedOptions.includes(option.value) && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                        {IconComponent && <IconComponent className="w-5 h-5 text-slate-600" />}
                        <span className="font-medium text-slate-900 text-sm">
                          {option.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-sm text-slate-500 mt-4">
                {currentQ.optional ? 'Optional - ' : ''}Selected: {selectedOptions.length}{currentQ.max ? ` / ${currentQ.max}` : ''}
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
            {isLastQuestion ? (
              <>
                Review Answers
                <ChevronRight className="w-4 h-4" />
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
