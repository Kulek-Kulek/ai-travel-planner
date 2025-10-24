import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";

/**
 * API Route: Update User Subscription Tier
 * 
 * POST /api/admin/update-user-tier
 * 
 * Body: { userId: string, tier: 'free' | 'basic' | 'premium' | 'enterprise' }
 * 
 * Admin-only endpoint to manually update a user's subscription tier.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, tier } = body;

    // Validate inputs
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    const validTiers = ["free", "basic", "premium", "enterprise"];
    if (!tier || !validTiers.includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be one of: " + validTiers.join(", ") },
        { status: 400 }
      );
    }

    // Update user's tier
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: tier,
        subscription_status: tier === "free" ? "active" : "active", // Keep active for all
      })
      .eq("id", userId)
      .select("id, subscription_tier, subscription_status")
      .single();

    if (error) {
      console.error("Error updating user tier:", error);
      return NextResponse.json(
        { error: "Failed to update user tier" },
        { status: 500 }
      );
    }

    // Log the change in subscription_history
    await supabase.from("subscription_history").insert({
      user_id: userId,
      tier,
      status: "active",
      change_reason: "Manual update by admin",
    });

    return NextResponse.json({
      success: true,
      data,
      message: `User tier updated to ${tier}`,
    });

  } catch (error) {
    console.error("Error in update-user-tier API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

