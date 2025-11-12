/**
 * Data Transfer Objects (DTOs) for AI Travel Planner
 * 
 * This file contains all DTO types derived from database models.
 * Each DTO is designed for specific API operations and Server Actions.
 * 
 * Generated from: src/types/database.types.ts
 * @see src/types/database.types.ts for database entity definitions
 */

import type { Database } from './database.types';

// ============================================================================
// DATABASE TABLE TYPES (Direct extracts for convenience)
// ============================================================================

/** Profile table row type */
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/** Itinerary table row type */
export type ItineraryRow = Database['public']['Tables']['itineraries']['Row'];

/** Bucket list table row type */
export type BucketListRow = Database['public']['Tables']['bucket_list']['Row'];

/** Subscription history table row type */
export type SubscriptionHistoryRow = Database['public']['Tables']['subscription_history']['Row'];

/** Stripe transaction table row type */
export type StripeTransactionRow = Database['public']['Tables']['stripe_transactions']['Row'];

/** AI usage log table row type */
export type AIUsageLogRow = Database['public']['Tables']['ai_usage_logs']['Row'];

/** Rate limits table row type */
export type RateLimitRow = Database['public']['Tables']['rate_limits']['Row'];

/** Deleted users table row type */
export type DeletedUserRow = Database['public']['Tables']['deleted_users']['Row'];

// ============================================================================
// COMMON DTOs
// ============================================================================

/**
 * Generic action result wrapper for Server Actions
 * Provides consistent success/error response structure
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; requireAuth?: boolean };

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  /** Number of items per page */
  limit?: number;
  /** Starting index for pagination */
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  /** Total count of items (for pagination) */
  total: number;
  /** Current limit */
  limit: number;
  /** Current offset */
  offset: number;
}

// ============================================================================
// AUTH DTOs
// ============================================================================

/**
 * Sign up input DTO
 * Used for user registration
 */
export interface SignUpDTO {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

/**
 * Sign in input DTO
 * Used for user authentication
 */
export interface SignInDTO {
  email: string;
  password: string;
}

/**
 * User session DTO
 * Returned after successful authentication
 */
export interface UserSessionDTO {
  userId: string;
  email: string;
  name?: string;
}

// ============================================================================
// PROFILE DTOs
// ============================================================================

/**
 * User profile DTO
 * Simplified profile information for display
 */
export interface UserProfileDTO
  extends Pick<
    ProfileRow,
    | 'id'
    | 'email'
    | 'full_name'
    | 'interests'
    | 'travel_style'
    | 'pace'
    | 'budget_band'
    | 'dietary_needs'
    | 'accessibility_needs'
    | 'subscription_tier'
    | 'subscription_status'
    | 'created_at'
  > {
  /** Display name (computed from full_name or email) */
  displayName: string;
}

/**
 * Update profile name DTO
 */
export interface UpdateProfileNameDTO {
  name: string;
}

/**
 * Update password DTO
 */
export interface UpdatePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Travel profile preferences DTO
 * Used for updating travel-related profile fields
 */
export type TravelPreferencesDTO = Pick<
  ProfileRow,
  | 'interests'
  | 'travel_style'
  | 'pace'
  | 'budget_band'
  | 'dietary_needs'
  | 'accessibility_needs'
  | 'accommodation_preferences'
  | 'activity_preferences'
  | 'dining_preferences'
  | 'social_preferences'
>;

/**
 * Complete travel profile DTO
 * Includes AI-generated personality data
 */
export interface CompleteTravelProfileDTO
  extends TravelPreferencesDTO,
    Pick<
      ProfileRow,
      | 'travel_personality'
      | 'profile_summary'
      | 'profile_confidence_score'
      | 'quiz_completed_at'
    > {}

// ============================================================================
// ITINERARY DTOs
// ============================================================================

/**
 * AI Plan structure (nested JSON in itinerary)
 */
export interface AIPlanDTO {
  city: string;
  days: Array<{
    title: string;
    places: Array<{
      name: string;
      desc: string;
      time: string;
    }>;
  }>;
}

/**
 * Itinerary DTO for display
 * Used in lists and detail views
 */
export interface ItineraryDTO
  extends Pick<
    ItineraryRow,
    | 'id'
    | 'user_id'
    | 'destination'
    | 'days'
    | 'travelers'
    | 'children'
    | 'child_ages'
    | 'start_date'
    | 'end_date'
    | 'has_accessibility_needs'
    | 'notes'
    | 'tags'
    | 'is_private'
    | 'status'
    | 'likes'
    | 'ai_model_used'
    | 'image_url'
    | 'image_photographer'
    | 'image_photographer_url'
    | 'created_at'
    | 'updated_at'
  > {
  /** Parsed AI plan */
  ai_plan: AIPlanDTO;
  /** Creator's display name (from profiles join) */
  creator_name?: string | null;
}

/**
 * Create itinerary input DTO
 * Used for generating new itineraries
 */
export interface CreateItineraryDTO {
  destination: string;
  days: number;
  travelers: number;
  children?: number;
  childAges?: number[];
  startDate?: Date;
  endDate?: Date;
  hasAccessibilityNeeds?: boolean;
  notes?: string;
  model?: string;
  turnstileToken?: string; // Cloudflare Turnstile for bot protection
}

/**
 * Update itinerary input DTO
 * Used for editing itinerary metadata
 */
export interface UpdateItineraryDTO {
  destination?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Update itinerary privacy DTO
 */
export interface UpdateItineraryPrivacyDTO {
  isPrivate: boolean;
}

/**
 * Update itinerary status DTO
 */
export interface UpdateItineraryStatusDTO {
  status: 'draft' | 'published' | 'active' | 'completed' | 'archived';
}

/**
 * Itinerary filter options DTO
 * Used for filtering public itineraries
 */
export interface ItineraryFilterDTO extends PaginationParams {
  /** Filter by tags */
  tags?: string[];
  /** Filter by destination (case-insensitive partial match) */
  destination?: string;
}

/**
 * Itinerary list response DTO
 */
export interface ItineraryListResponseDTO {
  itineraries: ItineraryDTO[];
  total: number;
}

/**
 * Draft itinerary DTO
 * Used for anonymous users before sign-in
 */
export interface SaveDraftItineraryDTO {
  destination: string;
  days: number;
  travelers: number;
  children?: number;
  childAges?: number[];
  hasAccessibilityNeeds?: boolean;
  notes?: string;
  aiPlan: AIPlanDTO;
}

/**
 * Edit itinerary input DTO
 * Used for regenerating itineraries
 */
export interface EditItineraryDTO extends CreateItineraryDTO {
  /** ID of itinerary being edited */
  existingItineraryId: string;
  /** Operation type */
  operation: 'edit' | 'regenerate';
  /** Whether to keep existing photo */
  keepExistingPhoto?: boolean;
  /** Existing photo data */
  existingPhotoData?: {
    image_url?: string | null;
    image_photographer?: string | null;
    image_photographer_url?: string | null;
  };
}

// ============================================================================
// SUBSCRIPTION DTOs
// ============================================================================

/**
 * Subscription tier type
 */
export type SubscriptionTier = 'free' | 'payg' | 'pro';

/**
 * Subscription status type
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trial';

/**
 * User subscription info DTO
 * Comprehensive subscription and usage information
 */
export interface UserSubscriptionDTO
  extends Pick<
    ProfileRow,
    | 'id'
    | 'subscription_tier'
    | 'subscription_status'
    | 'credits_balance'
    | 'monthly_economy_used'
    | 'monthly_premium_used'
    | 'premium_rollover'
    | 'plans_created_count'
    | 'billing_cycle_start'
    | 'last_generation_at'
    | 'stripe_customer_id'
    | 'stripe_subscription_id'
    | 'subscription_end_date'
  > {
  /** User ID */
  userId: string;
  /** Subscription tier */
  tier: SubscriptionTier;
  /** Subscription status */
  status: SubscriptionStatus;
  /** Credits balance (for PAYG) */
  creditsBalance: number;
}

/**
 * Can generate plan result DTO
 * Returned by subscription checks
 */
export interface CanGeneratePlanDTO {
  /** Whether user can generate a plan */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Cost in EUR */
  cost?: number;
  /** Whether user needs to upgrade */
  needsUpgrade?: boolean;
  /** Whether user needs to top up credits */
  needsTopup?: boolean;
  /** Whether using PAYG credits */
  usingCredits?: boolean;
  /** Whether in unlimited mode (Pro tier economy) */
  unlimitedMode?: boolean;
  /** New balance after deduction */
  newBalance?: number;
}

/**
 * Usage statistics DTO
 * User's AI usage analytics
 */
export interface UsageStatsDTO {
  /** Total plans created */
  totalPlans: number;
  /** Plans created this month */
  thisMonthPlans: number;
  /** Total cost */
  totalCost: number;
  /** This month cost */
  thisMonthCost: number;
  /** Usage by model */
  modelUsage: Record<string, number>;
}

/**
 * Add credits DTO
 */
export interface AddCreditsDTO {
  /** Amount in EUR to add */
  amount: number;
}

/**
 * Update subscription tier DTO
 */
export interface UpdateSubscriptionTierDTO {
  tier: SubscriptionTier;
}

/**
 * Rate limit check result DTO
 */
export interface RateLimitCheckDTO {
  /** Whether request is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Minutes until reset */
  resetIn?: number;
}

// ============================================================================
// BUCKET LIST DTOs
// ============================================================================

/**
 * Bucket list item DTO
 * Itinerary saved to user's bucket list
 */
export interface BucketListItemDTO extends Pick<BucketListRow, 'id' | 'itinerary_id' | 'added_at'> {
  /** Full itinerary details */
  itinerary: ItineraryDTO;
}

/**
 * Add to bucket list DTO
 */
export interface AddToBucketListDTO {
  itineraryId: string;
}

/**
 * Remove from bucket list DTO
 */
export interface RemoveFromBucketListDTO {
  itineraryId: string;
}

/**
 * Bucket list response DTO
 */
export interface BucketListResponseDTO {
  items: ItineraryDTO[];
  total: number;
}

// ============================================================================
// AI GENERATION DTOs
// ============================================================================

/**
 * Model selection type
 */
export type ModelKey = 'gemini-flash' | 'gpt-4o-mini' | 'claude-haiku' | 'gpt-4o';

/**
 * Generate itinerary input DTO
 * Complete input for AI itinerary generation
 */
export interface GenerateItineraryDTO {
  // Trip details
  destination: string;
  days: number;
  travelers: number;
  children?: number;
  childAges?: number[];
  startDate?: Date;
  endDate?: Date;
  hasAccessibilityNeeds?: boolean;
  notes?: string;

  // AI model selection
  model: ModelKey;

  // Bot protection
  turnstileToken?: string;

  // Edit/regenerate context
  existingItineraryId?: string;
  operation?: 'create' | 'edit' | 'regenerate';
  keepExistingPhoto?: boolean;
  existingPhotoData?: {
    image_url?: string | null;
    image_photographer?: string | null;
    image_photographer_url?: string | null;
  };
}

/**
 * AI generation result DTO
 */
export interface AIGenerationResultDTO {
  /** Generated itinerary ID */
  itineraryId: string;
  /** AI plan content */
  aiPlan: AIPlanDTO;
  /** Generated tags */
  tags: string[];
  /** Image URL */
  imageUrl?: string | null;
  /** Photographer name */
  imagePhotographer?: string | null;
  /** Photographer URL */
  imagePhotographerUrl?: string | null;
}

/**
 * Record plan generation DTO
 */
export interface RecordPlanGenerationDTO {
  planId: string;
  model: ModelKey;
  operation: 'create' | 'edit' | 'regenerate';
}

// ============================================================================
// ADMIN DTOs
// ============================================================================

/**
 * Admin user list item DTO
 */
export type AdminUserDTO = Pick<
  ProfileRow,
  | 'id'
  | 'email'
  | 'full_name'
  | 'role'
  | 'subscription_tier'
  | 'subscription_status'
  | 'plans_created_count'
  | 'created_at'
>;

/**
 * Admin itinerary list item DTO
 */
export interface AdminItineraryDTO extends ItineraryDTO {
  /** Owner's email */
  ownerEmail?: string;
}

/**
 * Admin usage log DTO
 */
export interface AdminUsageLogDTO
  extends Pick<
    AIUsageLogRow,
    | 'id'
    | 'user_id'
    | 'ai_model'
    | 'operation'
    | 'estimated_cost'
    | 'subscription_tier'
    | 'success'
    | 'created_at'
  > {
  /** User email */
  userEmail?: string;
}

/**
 * Admin stats DTO
 */
export interface AdminStatsDTO {
  /** Total users */
  totalUsers: number;
  /** Total itineraries */
  totalItineraries: number;
  /** Total AI generations */
  totalGenerations: number;
  /** Total cost */
  totalCost: number;
  /** Users by tier */
  usersByTier: Record<SubscriptionTier, number>;
  /** Generations by model */
  generationsByModel: Record<string, number>;
}

/**
 * Update user role DTO
 */
export interface UpdateUserRoleDTO {
  userId: string;
  role: 'user' | 'admin';
}

/**
 * Update user tier DTO (admin operation)
 */
export interface AdminUpdateUserTierDTO {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
}

// ============================================================================
// STRIPE / PAYMENT DTOs
// ============================================================================

/**
 * Stripe transaction DTO
 */
export type StripeTransactionDTO = Pick<
  StripeTransactionRow,
  | 'id'
  | 'amount'
  | 'currency'
  | 'transaction_type'
  | 'status'
  | 'stripe_payment_intent_id'
  | 'stripe_session_id'
  | 'created_at'
>;

/**
 * Create payment session DTO
 */
export interface CreatePaymentSessionDTO {
  /** Amount in EUR */
  amount: number;
  /** Transaction type */
  type: 'subscription' | 'credit_purchase';
  /** Success redirect URL */
  successUrl: string;
  /** Cancel redirect URL */
  cancelUrl: string;
}

/**
 * Payment session result DTO
 */
export interface PaymentSessionResultDTO {
  /** Stripe checkout session ID */
  sessionId: string;
  /** Checkout URL */
  url: string;
}

// ============================================================================
// ANALYTICS / REPORTING DTOs
// ============================================================================

/**
 * User activity summary DTO
 */
export interface UserActivitySummaryDTO {
  /** User ID */
  userId: string;
  /** Total itineraries created */
  totalItineraries: number;
  /** Public itineraries */
  publicItineraries: number;
  /** Private itineraries */
  privateItineraries: number;
  /** Bucket list size */
  bucketListSize: number;
  /** Last activity date */
  lastActivity?: string;
}

/**
 * Popular destination DTO
 */
export interface PopularDestinationDTO {
  destination: string;
  count: number;
  /** Average days */
  avgDays: number;
  /** Average travelers */
  avgTravelers: number;
}

/**
 * Popular tag DTO
 */
export interface PopularTagDTO {
  tag: string;
  count: number;
}

// ============================================================================
// ERROR DTOs
// ============================================================================

/**
 * Validation error DTO
 * Used for form validation errors
 */
export interface ValidationErrorDTO {
  field: string;
  message: string;
}

/**
 * API error DTO
 * Standardized error response
 */
export interface APIErrorDTO {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
  validationErrors?: ValidationErrorDTO[];
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ActionResult success
 */
export function isActionSuccess<T>(result: ActionResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard for ActionResult error
 */
export function isActionError<T>(result: ActionResult<T>): result is { success: false; error: string } {
  return result.success === false;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Create input type (for database inserts)
 * Omits auto-generated fields
 */
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Update input type (for database updates)
 * Makes all fields optional except ID
 */
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>> & { id: string };

/**
 * Filter type for list queries
 * Generic filter with pagination
 */
export interface BaseFilterDTO extends PaginationParams {
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

