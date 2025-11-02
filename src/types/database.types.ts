export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_usage_logs: {
        Row: {
          actual_cost: number | null
          ai_model: string
          created_at: string | null
          credits_deducted: number | null
          error_message: string | null
          estimated_cost: number
          id: string
          operation: string
          plan_id: string | null
          subscription_tier: string
          success: boolean | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          ai_model: string
          created_at?: string | null
          credits_deducted?: number | null
          error_message?: string | null
          estimated_cost: number
          id?: string
          operation: string
          plan_id?: string | null
          subscription_tier: string
          success?: boolean | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          ai_model?: string
          created_at?: string | null
          credits_deducted?: number | null
          error_message?: string | null
          estimated_cost?: number
          id?: string
          operation?: string
          plan_id?: string | null
          subscription_tier?: string
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bucket_list: {
        Row: {
          added_at: string
          id: string
          itinerary_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          itinerary_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          itinerary_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_list_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_users: {
        Row: {
          deleted_at: string | null
          deleted_reason: string | null
          email: string | null
          full_name: string | null
          id: string
          itineraries_count: number | null
          plans_created_count: number | null
          subscription_tier: string | null
        }
        Insert: {
          deleted_at?: string | null
          deleted_reason?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          itineraries_count?: number | null
          plans_created_count?: number | null
          subscription_tier?: string | null
        }
        Update: {
          deleted_at?: string | null
          deleted_reason?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          itineraries_count?: number | null
          plans_created_count?: number | null
          subscription_tier?: string | null
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          ai_model_used: string | null
          ai_plan: Json
          child_ages: number[] | null
          children: number | null
          created_at: string
          creator_name: string | null
          days: number
          destination: string
          edit_count: number | null
          end_date: string | null
          generation_cost: number | null
          has_accessibility_needs: boolean | null
          id: string
          image_photographer: string | null
          image_photographer_url: string | null
          image_url: string | null
          is_private: boolean
          likes: number
          notes: string | null
          session_id: string | null
          start_date: string | null
          status: string
          tags: string[] | null
          travelers: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_model_used?: string | null
          ai_plan: Json
          child_ages?: number[] | null
          children?: number | null
          created_at?: string
          creator_name?: string | null
          days: number
          destination: string
          edit_count?: number | null
          end_date?: string | null
          generation_cost?: number | null
          has_accessibility_needs?: boolean | null
          id?: string
          image_photographer?: string | null
          image_photographer_url?: string | null
          image_url?: string | null
          is_private?: boolean
          likes?: number
          notes?: string | null
          session_id?: string | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          travelers: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_model_used?: string | null
          ai_plan?: Json
          child_ages?: number[] | null
          children?: number | null
          created_at?: string
          creator_name?: string | null
          days?: number
          destination?: string
          edit_count?: number | null
          end_date?: string | null
          generation_cost?: number | null
          has_accessibility_needs?: boolean | null
          id?: string
          image_photographer?: string | null
          image_photographer_url?: string | null
          image_url?: string | null
          is_private?: boolean
          likes?: number
          notes?: string | null
          session_id?: string | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          travelers?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accessibility_needs: string[] | null
          accommodation_preferences: string[] | null
          activity_preferences: string[] | null
          billing_cycle_start: string | null
          budget_band: string | null
          created_at: string
          credits_balance: number | null
          dietary_needs: string[] | null
          dining_preferences: string[] | null
          email: string | null
          full_name: string | null
          generation_credits: number
          id: string
          interests: string[] | null
          is_admin: boolean | null
          last_generation_at: string | null
          monthly_economy_used: number | null
          monthly_premium_used: number | null
          pace: string | null
          plans_created_count: number | null
          premium_rollover: number | null
          profile_confidence_score: number | null
          profile_summary: string | null
          profile_version: number | null
          quiz_completed_at: string | null
          quiz_responses: Json | null
          role: string
          social_preferences: string[] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          travel_personality: string | null
          travel_style: string | null
          updated_at: string
        }
        Insert: {
          accessibility_needs?: string[] | null
          accommodation_preferences?: string[] | null
          activity_preferences?: string[] | null
          billing_cycle_start?: string | null
          budget_band?: string | null
          created_at?: string
          credits_balance?: number | null
          dietary_needs?: string[] | null
          dining_preferences?: string[] | null
          email?: string | null
          full_name?: string | null
          generation_credits?: number
          id: string
          interests?: string[] | null
          is_admin?: boolean | null
          last_generation_at?: string | null
          monthly_economy_used?: number | null
          monthly_premium_used?: number | null
          pace?: string | null
          plans_created_count?: number | null
          premium_rollover?: number | null
          profile_confidence_score?: number | null
          profile_summary?: string | null
          profile_version?: number | null
          quiz_completed_at?: string | null
          quiz_responses?: Json | null
          role?: string
          social_preferences?: string[] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          travel_personality?: string | null
          travel_style?: string | null
          updated_at?: string
        }
        Update: {
          accessibility_needs?: string[] | null
          accommodation_preferences?: string[] | null
          activity_preferences?: string[] | null
          billing_cycle_start?: string | null
          budget_band?: string | null
          created_at?: string
          credits_balance?: number | null
          dietary_needs?: string[] | null
          dining_preferences?: string[] | null
          email?: string | null
          full_name?: string | null
          generation_credits?: number
          id?: string
          interests?: string[] | null
          is_admin?: boolean | null
          last_generation_at?: string | null
          monthly_economy_used?: number | null
          monthly_premium_used?: number | null
          pace?: string | null
          plans_created_count?: number | null
          premium_rollover?: number | null
          profile_confidence_score?: number | null
          profile_summary?: string | null
          profile_version?: number | null
          quiz_completed_at?: string | null
          quiz_responses?: Json | null
          role?: string
          social_preferences?: string[] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          travel_personality?: string | null
          travel_style?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          day_start: string | null
          generations_last_hour: number | null
          generations_today: number | null
          last_generation_at: string | null
          updated_at: string | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          day_start?: string | null
          generations_last_hour?: number | null
          generations_today?: number | null
          last_generation_at?: string | null
          updated_at?: string | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          day_start?: string | null
          generations_last_hour?: number | null
          generations_today?: number | null
          last_generation_at?: string | null
          updated_at?: string | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          transaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          status: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          transaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          transaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          change_reason: string | null
          changed_from: string | null
          created_at: string | null
          id: string
          status: string
          stripe_subscription_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_from?: string | null
          created_at?: string | null
          id?: string
          status: string
          stripe_subscription_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          change_reason?: string | null
          changed_from?: string | null
          created_at?: string | null
          id?: string
          status?: string
          stripe_subscription_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_generate_plan: {
        Args: { p_model: string; p_user_id: string }
        Returns: Json
      }
      reset_monthly_usage: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
