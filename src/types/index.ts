/**
 * Centralized exports for all type definitions
 * 
 * Import types from here for consistency:
 * ```ts
 * import type { UserProfileDTO, ItineraryDTO } from '@/types';
 * ```
 */

// Database types (Supabase-generated)
export type { Database, Tables, TablesInsert, TablesUpdate } from './database.types';
export type {
  ProfileRow,
  ItineraryRow,
  BucketListRow,
  SubscriptionHistoryRow,
  StripeTransactionRow,
  AIUsageLogRow,
  RateLimitRow,
  DeletedUserRow,
} from './dto';

// DTOs (Data Transfer Objects)
export type {
  // Common
  ActionResult,
  PaginationParams,
  PaginatedResponse,
  
  // Auth
  SignUpDTO,
  SignInDTO,
  UserSessionDTO,
  
  // Profile
  UserProfileDTO,
  UpdateProfileNameDTO,
  UpdatePasswordDTO,
  TravelPreferencesDTO,
  CompleteTravelProfileDTO,
  
  // Itinerary
  AIPlanDTO,
  ItineraryDTO,
  CreateItineraryDTO,
  UpdateItineraryDTO,
  UpdateItineraryPrivacyDTO,
  UpdateItineraryStatusDTO,
  ItineraryFilterDTO,
  ItineraryListResponseDTO,
  SaveDraftItineraryDTO,
  EditItineraryDTO,
  
  // Subscription
  SubscriptionTier,
  SubscriptionStatus,
  UserSubscriptionDTO,
  CanGeneratePlanDTO,
  UsageStatsDTO,
  AddCreditsDTO,
  UpdateSubscriptionTierDTO,
  RateLimitCheckDTO,
  
  // Bucket List
  BucketListItemDTO,
  AddToBucketListDTO,
  RemoveFromBucketListDTO,
  BucketListResponseDTO,
  
  // AI Generation
  ModelKey,
  GenerateItineraryDTO,
  AIGenerationResultDTO,
  RecordPlanGenerationDTO,
  
  // Admin
  AdminUserDTO,
  AdminItineraryDTO,
  AdminUsageLogDTO,
  AdminStatsDTO,
  UpdateUserRoleDTO,
  AdminUpdateUserTierDTO,
  
  // Payment
  StripeTransactionDTO,
  CreatePaymentSessionDTO,
  PaymentSessionResultDTO,
  
  // Analytics
  UserActivitySummaryDTO,
  PopularDestinationDTO,
  PopularTagDTO,
  
  // Errors
  ValidationErrorDTO,
  APIErrorDTO,
  
  // Helper types
  CreateInput,
  UpdateInput,
  BaseFilterDTO,
} from './dto';

// Type guards
export { isActionSuccess, isActionError } from './dto';

// Travel Profile types
export type {
  TravelProfile,
  QuizResponse,
  TravelFrequency,
  TravelPace,
  BudgetStyle,
  PlanningStyle,
  MorningType,
  FoodAdventure,
  SocialStyle,
  ActivityPreferences,
  ProfileGenerationResult,
} from './travel-profile';

// Extraction types
export type { ExtractedTravelInfo } from '../lib/types/extract-travel-info-types';
export { extractionSchema } from '../lib/types/extract-travel-info-types';

