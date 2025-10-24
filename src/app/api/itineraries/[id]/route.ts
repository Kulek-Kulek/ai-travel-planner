import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Itinerary ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the itinerary - allow public access to public itineraries
    const { data, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching itinerary:", error);
      return NextResponse.json(
        { success: false, error: "Itinerary not found" },
        { status: 404 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Itinerary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}


