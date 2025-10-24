/**
 * Types and schemas for travel information extraction
 * 
 * Separated from the Server Action file because "use server" files
 * can only export async functions, not types or schemas.
 */

import { z } from "zod";

// Schema for extracted travel information
export const extractionSchema = z.object({
  destination: z.string().nullable().describe("City, region, or country name"),
  days: z.number().int().min(1).max(30).nullable().describe("Number of days for the trip"),
  travelers: z.number().int().min(1).max(20).nullable().describe("Number of adult travelers (18+)"),
  children: z.number().int().min(0).max(10).nullable().describe("Number of children under 18"),
  childAges: z.array(z.number().int().min(0).max(17)).optional().describe("Ages of children mentioned (e.g., [14, 16])"),
  startDate: z.string().nullable().describe("Start date if mentioned (YYYY-MM-DD format)"),
  endDate: z.string().nullable().describe("End date if mentioned (YYYY-MM-DD format)"),
  hasAccessibilityNeeds: z.boolean().describe("Whether accessibility needs are mentioned"),
  travelStyle: z.string().nullable().describe("Travel style preferences (e.g., luxury, budget, adventure)"),
  interests: z.array(z.string()).describe("Interests or activities mentioned (e.g., food, museums, hiking)"),
});

export type ExtractedTravelInfo = z.infer<typeof extractionSchema>;

