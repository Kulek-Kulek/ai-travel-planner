"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format, differenceInDays, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_MODEL_OPTIONS,
  OPENROUTER_MODEL_VALUES,
} from "@/lib/openrouter/models";
import { isEnglishText } from "@/lib/utils/language-detector";

// Types for extracted information
interface ExtractedInfo {
  destination: string | null;
  days: number | null;
  travelers: number | null;
  children: number | null;
  hasAccessibilityNeeds: boolean;
}

// Helper function to extract information from text
function extractTravelInfo(text: string): ExtractedInfo {
  const result: ExtractedInfo = {
    destination: null,
    days: null,
    travelers: null,
    children: null,
    hasAccessibilityNeeds: false,
  };

  if (!text || text.trim().length === 0) {
    return result;
  }

  const lowerText = text.toLowerCase();

  // Extract destination - look for common patterns (case-insensitive)
  const destinationPatterns = [
    /(?:in|to|visit|visiting|explore|exploring|travel(?:l)?ing (?:on my own )?to|going to|trip to)\s+([a-zA-Z][a-zA-Z\s,\-']+?)(?:\s+for|\s+with|\s+during|\s+and|\.|,|$)/i,
    /^([a-zA-Z][a-zA-Z\s,\-']+?)(?:\s+for|\s+with|\s+trip|\s+in\s+\d|\.|,)/i,
  ];

  for (const pattern of destinationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const dest = match[1].trim();
      // Validate: reasonable length, no long numbers, not just common words
      const commonWords = ['the', 'a', 'an', 'my', 'our', 'this', 'that', 'these', 'those'];
      const isCommonWord = commonWords.includes(dest.toLowerCase());

      if (dest.length >= 2 && dest.length <= 50 && !/\d{2,}/.test(dest) && !isCommonWord) {
        // Capitalize first letter of each word for display
        result.destination = dest
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        break;
      }
    }
  }

  // Extract days/duration
  const daysPatterns = [
    /(\d+)[-\s]day/i,
    /(\d+)\s*days/i,
    /for\s+(\d+)\s+day/i,
    /(\d+)\s*night/i,
  ];

  for (const pattern of daysPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      const days = parseInt(match[1], 10);
      if (days > 0 && days <= 30) {
        result.days = days;
        break;
      }
    }
  }

  // Handle natural language day expressions if no number was found
  if (!result.days) {
    if (/\b(?:a day or two|day or two)\b/i.test(lowerText)) {
      result.days = 2; // Default to 2 for "a day or two"
    } else if (/\b(?:a couple of days|couple days)\b/i.test(lowerText)) {
      result.days = 2;
    } else if (/\b(?:a few days|few days)\b/i.test(lowerText)) {
      result.days = 3; // Default to 3 for "a few days"
    } else if (/\b(?:a week|one week)\b/i.test(lowerText)) {
      result.days = 7;
    } else if (/\b(?:a week or two|week or two)\b/i.test(lowerText)) {
      result.days = 10; // Average of 7-14
    } else if (/\b(?:two weeks|2 weeks)\b/i.test(lowerText)) {
      result.days = 14;
    } else if (/\b(?:a month|one month)\b/i.test(lowerText)) {
      result.days = 30; // Max allowed
    } else if (/\b(?:a long weekend|long weekend)\b/i.test(lowerText)) {
      result.days = 3;
    } else if (/\b(?:weekend|a weekend)\b/i.test(lowerText)) {
      result.days = 2;
    }
  }

  // Extract number of travelers/adults
  const travelerPatterns = [
    /for\s+(\d+)\s+(?:people|adults|travelers|persons)/i,
    /(\d+)\s+(?:adults|travelers|people|persons)/i,
    /party\s+of\s+(\d+)/i,
    /group\s+of\s+(\d+)/i,
  ];

  for (const pattern of travelerPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      const travelers = parseInt(match[1], 10);
      if (travelers > 0 && travelers <= 20) {
        result.travelers = travelers;
        break;
      }
    }
  }

  // Special patterns for couples, solo, etc.
  if (!result.travelers) {
    if (/\b(?:solo|alone|myself|just me|on my own|by myself)\b/i.test(lowerText)) {
      result.travelers = 1;
    } else if (/\b(?:couple|two of us|partner and i)\b/i.test(lowerText)) {
      result.travelers = 2;
    } else if (/\b(?:with my (?:wife|husband|spouse|partner))\b/i.test(lowerText)) {
      result.travelers = 2; // "with my wife" implies speaker + wife = 2 adults
    } else if (/\b(?:me and my (?:wife|husband|spouse|partner))\b/i.test(lowerText) || /\b(?:my (?:wife|husband|spouse|partner) and (?:me|i))\b/i.test(lowerText)) {
      result.travelers = 2; // "me and my wife" = 2 adults
    } else if (/\b(?:family of (\d+))\b/i.test(lowerText)) {
      const match = lowerText.match(/family of (\d+)/i);
      if (match && match[1]) {
        result.travelers = parseInt(match[1], 10);
      }
    }
  }

  // Extract children
  const childrenPatterns = [
    /(\d+)\s+(?:child|children|kid|kids)/i,
    /with\s+(?:my\s+)?(\d+)\s+(?:child|children|kid|kids)/i,
  ];

  for (const pattern of childrenPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      const children = parseInt(match[1], 10);
      if (children > 0 && children <= 10) {
        result.children = children;
        break;
      }
    }
  }

  // Check for accessibility needs
  if (/\b(?:wheelchair|accessibility|accessible|mobility|disabled|disability)\b/i.test(lowerText)) {
    result.hasAccessibilityNeeds = true;
  }

  return result;
}

// Validation schema
const itineraryFormSchema = z
  .object({
    destination: z
      .string()
      .min(2, "Destination must be at least 2 characters")
      .max(100, "Destination must be less than 100 characters"),
    days: z
      .number({ message: "Trip length must be a number" })
      .int("Number of days must be a whole number")
      .min(1, "Trip length must be at least 1 day")
      .max(30, "Trip cannot exceed 30 days"),
    travelers: z
      .number()
      .int("Number of travelers must be a whole number")
      .min(1, "At least 1 traveler required")
      .max(20, "Maximum 20 travelers allowed"),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    children: z
      .number()
      .int()
      .min(0)
      .max(10, "Maximum 10 children allowed")
      .optional(),
    childAges: z.array(z.number().int().min(0).max(17)).optional(),
    hasAccessibilityNeeds: z.boolean().optional(),
    notes: z
      .string()
      .min(20, "Please provide at least 20 characters describing your trip")
      .max(500, "Notes must be less than 500 characters"),
    model: z.enum(OPENROUTER_MODEL_VALUES, {
      message: "Select an AI provider",
    }),
  })
  .superRefine((data, ctx) => {
    if (
      (data.startDate && !data.endDate) ||
      (!data.startDate && data.endDate)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select both start and end dates or leave both empty.",
        path: ["endDate"],
      });
    }
  });

export type ItineraryFormData = z.infer<typeof itineraryFormSchema>;

interface ItineraryFormProps {
  onSubmit: (data: ItineraryFormData) => void;
  isLoading?: boolean;
}

export const ItineraryForm = ({
  onSubmit,
  isLoading = false,
}: ItineraryFormProps) => {
  const [childAgesInput, setChildAgesInput] = useState<string[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [showDetailedFields, setShowDetailedFields] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo>({
    destination: null,
    days: null,
    travelers: null,
    children: null,
    hasAccessibilityNeeds: false,
  });

  const form = useForm<ItineraryFormData>({
    resolver: zodResolver(itineraryFormSchema),
    defaultValues: {
      destination: "",
      days: 0,
      travelers: 1,
      children: undefined,
      childAges: [],
      hasAccessibilityNeeds: false,
      notes: "",
      model: DEFAULT_OPENROUTER_MODEL,
    },
  });

  const watchChildren = form.watch("children");
  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const watchNotes = form.watch("notes");

  // Extract information from notes in real-time
  useEffect(() => {
    const extracted = extractTravelInfo(watchNotes);
    setExtractedInfo(extracted);

    // Check if text is in English (for language hint)
    const isEnglish = isEnglishText(watchNotes);
    if (!isEnglish && watchNotes.length > 20) {
      // Non-English text detected - extraction may be limited
    }

    // Auto-fill fields if they're empty and we extracted something
    if (extracted.destination && !form.getValues("destination")) {
      form.setValue("destination", extracted.destination, { shouldValidate: false });
    } else if (!extracted.destination && form.getValues("destination") && !showDetailedFields) {
      // Clear destination if extraction lost it and user hasn't manually filled fields
      form.setValue("destination", "", { shouldValidate: false });
    }

    if (extracted.days && !form.getValues("days")) {
      form.setValue("days", extracted.days, { shouldValidate: false });
    } else if (!extracted.days && form.getValues("days") > 0 && !showDetailedFields) {
      // Clear days if extraction lost it and user hasn't manually filled fields
      form.setValue("days", 0, { shouldValidate: false });
    }

    if (extracted.travelers && form.getValues("travelers") === 1) {
      form.setValue("travelers", extracted.travelers, { shouldValidate: false });
    }

    if (extracted.children && !form.getValues("children")) {
      form.setValue("children", extracted.children, { shouldValidate: false });
    }

    if (extracted.hasAccessibilityNeeds) {
      form.setValue("hasAccessibilityNeeds", true, { shouldValidate: false });
    }
  }, [watchNotes, form, showDetailedFields]);

  // Auto-calculate days when dates are selected
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      const daysDiff = differenceInDays(watchEndDate, watchStartDate) + 1;
      if (daysDiff > 0 && daysDiff <= 30) {
        form.setValue("days", daysDiff);
      }
    }
  }, [watchStartDate, watchEndDate, form]);

  // Update child ages input fields when number of children changes
  useEffect(() => {
    if (!watchChildren || watchChildren <= 0) {
      setChildAgesInput([]);
      form.setValue("childAges", []);
      return;
    }

    const nextLength = watchChildren;
    setChildAgesInput((prev) => {
      const next = [...prev];
      next.length = nextLength;
      for (let i = 0; i < nextLength; i += 1) {
        if (typeof next[i] === "undefined") {
          next[i] = "";
        }
      }
      return next;
    });
  }, [watchChildren, form]);

  const handleFormSubmit = (data: ItineraryFormData) => {
    // Capitalize destination (convert to title case)
    const capitalizedData = {
      ...data,
      destination: data.destination
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" "),
      children: data.children ?? 0,
      childAges: data.childAges ?? [],
    };

    onSubmit(capitalizedData);
  };

  const handleFormError = () => {
    // If there are errors, show the detailed fields
    setShowDetailedFields(true);

    toast.error("Please provide missing information", {
      description: "We need a few more details to generate your perfect itinerary",
    });
  };

  // Check what's missing - ensure we check for actual content, not just truthy values
  const destinationValue = form.getValues("destination");
  const hasDestination = extractedInfo.destination !== null || (destinationValue && destinationValue.trim().length > 0);
  const hasDays = extractedInfo.days !== null || (form.getValues("days") && form.getValues("days") > 0);
  // Only count as having travelers if extracted OR manually changed from default (1)
  const travelersValue = form.getValues("travelers");
  const hasTravelers = extractedInfo.travelers !== null || (travelersValue > 1); // Default is 1, so only consider it set if > 1 or extracted

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit, handleFormError)}
        className="space-y-10"
      >
        <section className="space-y-4">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold !text-slate-900">
                  Describe your ideal trip
                </FormLabel>
                <FormDescription className="text-sm text-slate-500">
                  Tell us about your travel plans in your own words. Include where you want to go,
                  for how long, who&apos;s traveling, and what you&apos;d like to experience.
                </FormDescription>
                <FormControl>
                  <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-1 shadow-[0_20px_60px_-45px_rgba(79,70,229,0.75)]">
                    <Textarea
                      placeholder="e.g., I'm planning a 6-day trip to Kyoto and Osaka for two adults. We're food lovers interested in tea ceremonies, hidden ramen bars, and a day trip to Nara. We'll be traveling in spring."
                      rows={10}
                      className="min-h-[200px] resize-y rounded-[26px] border-0 bg-white/90 px-5 py-4 text-base leading-7 text-slate-900 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-0"
                      {...field}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />

                {/* Language detection warning */}
                {watchNotes && watchNotes.length >= 20 && !isEnglishText(watchNotes) && (
                  <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600 text-lg">🌍</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900">
                          Non-English text detected
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Automatic extraction works best with English descriptions.
                          For multilingual support with high accuracy, consider upgrading to Premium (AI-powered extraction).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-time feedback indicators */}
                {watchNotes && watchNotes.length >= 20 && (
                  <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <p className="text-sm font-medium text-slate-700">
                      What we&apos;ve understood so far:
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        {hasDestination ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={hasDestination ? "text-slate-700" : "text-amber-700"}>
                          Destination: {extractedInfo.destination || "Not specified yet"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {hasDays ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={hasDays ? "text-slate-700" : "text-amber-700"}>
                          Trip length: {extractedInfo.days ? `${extractedInfo.days} days` : "Not specified yet"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {hasTravelers ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={hasTravelers ? "text-slate-700" : "text-amber-700"}>
                          Travelers: {extractedInfo.travelers || "Not specified yet"}
                        </span>
                      </div>
                      {extractedInfo.children && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-slate-700">
                            Children: {extractedInfo.children}
                          </span>
                        </div>
                      )}
                      {extractedInfo.hasAccessibilityNeeds && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-slate-700">
                            Accessibility needs noted
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Encouraging message about dates */}
                    {hasDestination && hasDays && hasTravelers && !watchStartDate && !watchEndDate && (
                      <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 text-lg">💡</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">
                              Pro tip: Add your travel dates for a more precise plan!
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Knowing your specific dates helps us recommend seasonal activities,
                              check for local events, and suggest the best times to visit attractions.
                              Click below to add them.
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowDetailedFields(true)}
                              className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline font-medium"
                            >
                              Add travel dates now →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {(!hasDestination || !hasDays || !hasTravelers) && (
                      <button
                        type="button"
                        onClick={() => setShowDetailedFields(true)}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 underline"
                      >
                        Fill in missing details manually
                      </button>
                    )}
                  </div>
                )}
              </FormItem>
            )}
          />
        </section>

        {/* Show detailed fields if user clicks or if there are validation errors */}
        {showDetailedFields && (
          <>
            <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_25px_80px_-65px_rgba(15,23,42,0.35)]">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Essential details
                </h3>
                <p className="text-sm text-slate-500">
                  Complete any missing information below.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem className="flex h-full flex-col">
                      <div className="space-y-1">
                        <FormLabel>
                          Destination <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormDescription>City, region, or country.</FormDescription>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="e.g., Paris, France"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <div className="mt-auto pt-2">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="days"
                  render={({ field }) => (
                    <FormItem className="flex h-full flex-col">
                      <div className="space-y-1">
                        <FormLabel>
                          Number of Days <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormDescription>
                          Between 1 and 30.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={field.value || ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              field.onChange(0);
                              return;
                            }
                            const parsed = parseInt(raw, 10);
                            field.onChange(Number.isNaN(parsed) ? 0 : parsed);
                          }}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <div className="mt-auto pt-2">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="travelers"
                  render={({ field }) => (
                    <FormItem className="flex h-full flex-col">
                      <div className="space-y-1">
                        <FormLabel>
                          Number of adults (18+) <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormDescription>
                          Max 20 adults.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 1)
                          }
                          disabled={isLoading}
                        />
                      </FormControl>
                      <div className="mt-auto pt-2">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date (optional)</FormLabel>
                      <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date ?? undefined);
                              if (date) {
                                setStartDateOpen(false);
                              }
                            }}
                            disabled={(date) =>
                              isBefore(date, startOfDay(new Date()))
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (optional)</FormLabel>
                      <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                            disabled={isLoading}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date ?? undefined);
                              if (date) {
                                setEndDateOpen(false);
                              }
                            }}
                            disabled={(date) => {
                              if (watchStartDate) {
                                return isBefore(date, watchStartDate);
                              }
                              return isBefore(date, startOfDay(new Date()));
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_-55px_rgba(15,23,42,0.4)]">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Additional details (optional)
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="children"
                  render={({ field }) => (
                    <FormItem className="flex h-full flex-col">
                      <div className="space-y-1">
                        <FormLabel>Children</FormLabel>
                        <FormDescription>
                          Guests under 18.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={field.value && field.value > 0 ? field.value : ""}
                          onChange={(e) => {
                            const numValue = parseInt(e.target.value, 10);
                            const value =
                              e.target.value === "" ||
                                Number.isNaN(numValue) ||
                                numValue === 0
                                ? undefined
                                : numValue;
                            field.onChange(value);
                          }}
                          disabled={isLoading}
                          placeholder="0"
                        />
                      </FormControl>
                      <div className="mt-auto pt-2">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {watchChildren && watchChildren > 0 && (
                <div className="space-y-3">
                  <FormLabel>Ages of Children (optional)</FormLabel>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: watchChildren || 0 }, (_, index) => (
                      <Select
                        key={index}
                        value={childAgesInput[index] || ""}
                        onValueChange={(value) => {
                          const newAges = [...childAgesInput];
                          newAges[index] = value;
                          setChildAgesInput(newAges);

                          const ages = newAges
                            .filter((age) => age !== "")
                            .map((age) => parseInt(age, 10));
                          form.setValue("childAges", ages);
                        }}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Child ${index + 1} age`} />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 17 }, (_, i) => i + 1).map((age) => (
                            <SelectItem key={age} value={age.toString()}>
                              {age} {age === 1 ? "year" : "years"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="hasAccessibilityNeeds"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white/90 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Accessibility Requirements
                      </FormLabel>
                      <FormDescription>
                        Enable wheelchair access, elevator availability, and other
                        mobility considerations
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </section>
          </>
        )}

        <section className="space-y-4">
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>AI provider</FormLabel>
                <FormDescription>
                  Choose the model that will plan your trip. Providers vary in
                  tone, depth, and cost.
                </FormDescription>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPENROUTER_MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-slate-500">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Button type="submit" className="w-full" disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              Generating Your Itinerary...
            </>
          ) : (
            <>
              <span className="mr-2">✨</span>
              Generate Itinerary
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

