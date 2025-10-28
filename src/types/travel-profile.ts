// Travel Profile Types for Agentic Profile Generation

export type TravelFrequency = 'rarely' | 'occasionally' | 'frequently' | 'constantly';
export type TravelPace = 'slow-zen' | 'relaxed' | 'balanced' | 'energetic' | 'maximum';
export type BudgetStyle = 'backpacker' | 'smart-saver' | 'comfort-seeker' | 'luxury-lover' | 'sky-is-limit';
export type PlanningStyle = 'wing-it' | 'rough-plan' | 'detailed-itinerary' | 'military-precision';
export type MorningType = 'night-owl' | 'flexible' | 'early-bird';
export type FoodAdventure = 'play-safe' | 'selective-adventurer' | 'try-anything';
export type SocialStyle = 'introvert-recharge' | 'ambivert-balance' | 'extrovert-energize';

// Activity preferences with intensity levels
export interface ActivityPreferences {
  // Cultural & Learning
  museums: 'avoid' | 'if-famous' | 'love-it';
  artGalleries: 'avoid' | 'if-famous' | 'love-it';
  historicalSites: 'avoid' | 'if-famous' | 'love-it';
  localCulture: 'observer' | 'participant' | 'immerse';
  
  // Active & Adventure
  hiking: 'avoid' | 'easy-trails' | 'challenging';
  watersports: 'avoid' | 'casual' | 'enthusiast';
  extremeSports: 'avoid' | 'maybe' | 'thrill-seeker';
  
  // Relaxation
  beaches: 'avoid' | 'occasional' | 'essential';
  spas: 'avoid' | 'occasional' | 'essential';
  
  // Urban & Entertainment
  shopping: 'avoid' | 'browse' | 'serious-shopper';
  nightlife: 'avoid' | 'occasional' | 'party-central';
  restaurants: 'necessity' | 'experience' | 'pilgrimage';
  
  // Nature & Outdoors
  nature: 'city-person' | 'balanced' | 'nature-lover';
  wildlife: 'avoid' | 'interested' | 'passionate';
  
  // Special Interests
  photography: 'phone-snaps' | 'hobbyist' | 'serious';
  localFood: 'tourist-spots' | 'local-gems' | 'street-food-hunter';
}

export interface QuizResponse {
  // Quick personality (3 questions)
  travelVibe: 'chill-explorer' | 'balanced-adventurer' | 'maximum-experience' | 'luxury-relaxation';
  morningType: MorningType;
  socialBattery: SocialStyle;
  
  // Travel style (3 questions)
  travelFrequency: TravelFrequency;
  planningStyle: PlanningStyle;
  dealBreaker: string[]; // Max 3
  
  // Activities (2 questions - grouped for speed)
  loveThese: string[]; // Top 5 activities they love
  hardPass: string[]; // Top 3 activities they avoid
  
  // Food & Comfort (2 questions)
  foodAdventure: FoodAdventure;
  budgetStyle: BudgetStyle;
  
  // Special considerations (2 questions)
  travelingWith: 'solo' | 'partner' | 'friends' | 'family' | 'varies';
  dietaryNeeds: string[];
  
  // Dream scenario (1 question - closed question)
  perfectDay: 'slow-foodie' | 'adventure-packed' | 'culture-deep-dive' | 'relaxed-explorer' | 'luxury-leisure' | 'balanced-mix';
}

export interface TravelProfile {
  // Core personality
  archetype: string; // "The Sunset Chaser" "The Culture Vulture" etc.
  personality_description: string; // 2-3 engaging sentences
  
  // Structured preferences (for database)
  interests: string[];
  travel_style: string;
  pace: string;
  budget_band: string;
  
  // Detailed preferences
  dietary_needs: string[];
  accommodation_preferences: string[];
  activity_preferences: string[];
  dining_preferences: string[];
  social_preferences: string[];
  
  // AI-generated insights
  profile_summary: string; // Engaging 1-paragraph summary
  travel_strengths: string[]; // 3-4 strengths
  pro_tips: string[]; // 3-4 personalized tips
  
  // Metadata
  confidence_score: number; // 0-1
  created_at: string;
}

export interface ProfileGenerationResult {
  success: boolean;
  data?: TravelProfile;
  error?: string;
}

