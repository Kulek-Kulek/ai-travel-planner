"use client";

/**
 * AI-Enhanced Itinerary Form
 * 
 * This version uses AI for extraction instead of regex patterns.
 * More accurate but requires API calls (costs money and adds latency).
 * 
 * Use this if the regex-based extraction isn't accurate enough.
 */

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format, differenceInDays, isBefore, startOfDay } from "date-fns";
import Link from "next/link";
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle, Sparkles, Lock, Info } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
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
  OPENROUTER_MODEL_OPTIONS,
  OPENROUTER_MODEL_VALUES,
} from "@/lib/openrouter/models";
import {
  AI_MODELS,
  type SubscriptionTier,
  formatCurrency,
} from "@/lib/config/pricing-models";
import { extractTravelInfoWithAI } from "@/lib/actions/extract-travel-info";
import { type ExtractedTravelInfo } from "@/lib/types/extract-travel-info-types";
import { calculateExtractionConfidence } from "@/lib/utils/extract-travel-info-utils";

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

// Extended type that includes the Turnstile token
export type ItineraryFormDataWithToken = ItineraryFormData & {
  turnstileToken?: string; // Optional for authenticated users regenerating itineraries
};

interface ItineraryFormProps {
  onSubmit: (data: ItineraryFormDataWithToken) => void;
  isLoading?: boolean;
  modelOverride?: string; // Allow overriding the default model based on user tier
  isAuthenticated?: boolean; // Whether the user is logged in
  hasResult?: boolean; // Whether a plan was already generated
  userTier?: SubscriptionTier; // User's subscription tier for model access control
  userCredits?: number; // PAYG credits balance
}

export const ItineraryFormAIEnhanced = ({
  onSubmit,
  isLoading = false,
  modelOverride,
  isAuthenticated = false,
  hasResult = false,
  userTier = 'free',
  // userCredits is available but not currently used in this component
}: ItineraryFormProps) => {
  const [childAgesInput, setChildAgesInput] = useState<string[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [showDetailedFields, setShowDetailedFields] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedTravelInfo | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionTimeout, setExtractionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  
  // Ref for the submit button to enable auto-scroll
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  // Track last time user typed to prevent scroll interruption
  const lastTypedTimeRef = useRef<number>(Date.now());

  const defaultFormValues = {
    destination: "",
    days: 0,
    travelers: 1,
    children: undefined,
    childAges: [],
    hasAccessibilityNeeds: false,
    notes: "",
    model: "google/gemini-2.0-flash-lite-001" as const, // Default to free tier model
  };

  const form = useForm<ItineraryFormData>({
    resolver: zodResolver(itineraryFormSchema),
    defaultValues: defaultFormValues,
  });

  const watchChildren = form.watch("children");
  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const watchNotes = form.watch("notes");

  // Track typing activity to prevent scroll interruption
  useEffect(() => {
    // Update timestamp whenever user types
    lastTypedTimeRef.current = Date.now();
  }, [watchNotes]);

  // AI-powered extraction with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (extractionTimeout) {
      clearTimeout(extractionTimeout);
    }

    // Don't extract if too short
    if (!watchNotes || watchNotes.trim().length < 10) {
      setExtractedInfo(null);
      return;
    }

    // Set new timeout - extract after user stops typing for 1.5 seconds
    const timeout = setTimeout(async () => {
      setIsExtracting(true);
      
      try {
        // Use modelOverride if provided (for tier-based model selection)
        const extracted = modelOverride 
          ? await extractTravelInfoWithAI(watchNotes, modelOverride)
          : await extractTravelInfoWithAI(watchNotes);
        setExtractedInfo(extracted);

        // Auto-fill fields if they're empty
        if (extracted.destination && !form.getValues("destination")) {
          form.setValue("destination", extracted.destination, { shouldValidate: false });
        }
        if (extracted.days && !form.getValues("days")) {
          form.setValue("days", extracted.days, { shouldValidate: false });
        }
        if (extracted.travelers && form.getValues("travelers") === 1) {
          form.setValue("travelers", extracted.travelers, { shouldValidate: false });
        }
        if (extracted.children && !form.getValues("children")) {
          form.setValue("children", extracted.children, { shouldValidate: false });
        }
        
        // Pre-fill child ages if extracted
        if (extracted.childAges && extracted.childAges.length > 0 && !form.getValues("childAges")?.length) {
          form.setValue("childAges", extracted.childAges, { shouldValidate: false });
          setChildAgesInput(extracted.childAges.map(age => age.toString()));
        }
        
        if (extracted.hasAccessibilityNeeds) {
          form.setValue("hasAccessibilityNeeds", true, { shouldValidate: false });
        }

        // Parse and set dates if provided
        if (extracted.startDate && !form.getValues("startDate")) {
          try {
            const startDate = new Date(extracted.startDate);
            if (!isNaN(startDate.getTime())) {
              form.setValue("startDate", startDate, { shouldValidate: false });
            }
          } catch (error) {
            console.error("Failed to parse startDate:", extracted.startDate, error);
          }
        }
        if (extracted.endDate && !form.getValues("endDate")) {
          try {
            const endDate = new Date(extracted.endDate);
            if (!isNaN(endDate.getTime())) {
              form.setValue("endDate", endDate, { shouldValidate: false });
            }
          } catch (error) {
            console.error("Failed to parse endDate:", extracted.endDate, error);
          }
        }
        
        // Trigger validation after all fields are set to update isValid state
        await form.trigger();
      } catch (error) {
        console.error("Extraction error:", error);
        toast.error("Failed to analyze your description", {
          description: "You can still fill in the fields manually",
        });
      } finally {
        setIsExtracting(false);
      }
    }, 1500);

    setExtractionTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchNotes]); // Only depend on watchNotes to trigger extraction

  // Auto-scroll to submit button when AI extraction completes and form is valid
  useEffect(() => {
    // Only scroll when extraction finishes (isExtracting becomes false), we have extracted info, and form is valid
    if (!isExtracting && extractedInfo && submitButtonRef.current && form.formState.isValid) {
      // Record when this effect starts (when extraction completes)
      const extractionCompleteTime = Date.now();
      
      // Wait 3 seconds before auto-scrolling to give user time to review extracted info
      const scrollTimeout = setTimeout(() => {
        // Before scrolling, check if user has typed since extraction completed
        const timeSinceLastTyped = Date.now() - lastTypedTimeRef.current;
        const timeSinceExtractionComplete = Date.now() - extractionCompleteTime;
        
        // Only scroll if user hasn't typed in the last 3 seconds
        // This prevents interrupting the user if they resumed typing
        if (timeSinceLastTyped >= 3000 || timeSinceLastTyped >= timeSinceExtractionComplete) {
          submitButtonRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 3000);
      
      // Cleanup: clear timeout if component unmounts or dependencies change
      return () => {
        clearTimeout(scrollTimeout);
      };
    }
  }, [isExtracting, extractedInfo, form.formState.isValid]);

  // Auto-calculate days when dates are selected, BUT only if days weren't already extracted from description
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      // Only auto-calculate if days wasn't explicitly set by extraction
      const shouldAutoCalculate = !extractedInfo?.days || form.getValues("days") === 0;
      if (shouldAutoCalculate) {
        const daysDiff = differenceInDays(watchEndDate, watchStartDate) + 1;
        if (daysDiff > 0 && daysDiff <= 30) {
          form.setValue("days", daysDiff);
        }
      }
    }
  }, [watchStartDate, watchEndDate, form, extractedInfo?.days]);

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
    // Check for Turnstile token (bot protection)
    if (!turnstileToken) {
      toast.error("Security verification required", {
        description: "Please complete the security check to continue",
      });
      return;
    }

    // Capitalize destination
    const capitalizedData: ItineraryFormDataWithToken = {
      ...data,
      destination: data.destination
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" "),
      children: data.children ?? 0,
      childAges: data.childAges ?? [],
      turnstileToken, // Add the token to the data
    };

    onSubmit(capitalizedData);
    
    // Reset token after submission to require new verification
    setTurnstileToken(null);
  };

  const handleFormError = () => {
    setShowDetailedFields(true);
    
    toast.error("Please provide missing information", {
      description: "We need a few more details to generate your perfect itinerary",
    });
  };

  // Check what's extracted/filled
  const hasDestination = extractedInfo?.destination !== null || form.getValues("destination");
  const hasDays = extractedInfo?.days !== null || (form.getValues("days") && form.getValues("days") > 0);
  const hasTravelers = extractedInfo?.travelers !== null || form.getValues("travelers") > 0;
  
  const confidence = extractedInfo ? calculateExtractionConfidence(extractedInfo) : 0;
  
  // Check if form should be disabled (user created plan while logged out)
  const isFormDisabled = !isAuthenticated && hasResult;

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
                <FormLabel className="text-lg font-semibold text-slate-900">
                  Describe your ideal trip
                </FormLabel>
                <FormDescription className="text-sm text-slate-500">
                  Tell us about your travel plans in your own words. Our AI will extract the key details automatically.
                </FormDescription>
                <FormControl>
                  <div className={`rounded-3xl border border-indigo-100 bg-indigo-50/60 p-1 shadow-[0_20px_60px_-45px_rgba(79,70,229,0.75)] ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Textarea
                      placeholder="e.g., I'm planning a 6-day trip to Kyoto and Osaka for two adults. We're food lovers interested in tea ceremonies, hidden ramen bars, and a day trip to Nara. We'll be traveling in spring."
                      rows={10}
                      className="min-h-[130px] resize-y rounded-[26px] border-0 bg-white/90 px-5 py-4 text-base leading-7 text-slate-900 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-0"
                      {...field}
                      disabled={isLoading || isFormDisabled}
                      maxLength={500}
                    />
                  </div>
                </FormControl>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>Be specific about your destination, duration, and interests</span>
                  <span className={cn(
                    "font-medium",
                    watchNotes.length > 450 && "text-amber-600",
                    watchNotes.length === 500 && "text-red-600"
                  )}>
                    {watchNotes.length}/500
                  </span>
                </div>
                {isFormDisabled && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mt-2 flex items-center gap-2">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>Sign in to create more itineraries</span>
                  </p>
                )}
                <FormMessage />

                {/* AI Analysis Status */}
                {isExtracting && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>AI is analyzing your description...</span>
                  </div>
                )}

                {/* AI Extraction Results */}
                {extractedInfo && !isExtracting && watchNotes.length >= 10 && (
                  <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">
                        AI-powered analysis complete
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-xs font-medium text-slate-500">
                          {confidence}% confidence
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        {hasDestination ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={hasDestination ? "text-slate-700" : "text-amber-700"}>
                          Destination: {form.getValues("destination") || extractedInfo.destination || "Not specified"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        {hasDays ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={hasDays ? "text-slate-700" : "text-amber-700"}>
                          Trip length: {form.getValues("days") > 0 ? `${form.getValues("days")} days` : (extractedInfo.days ? `${extractedInfo.days} days` : "Not specified")}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        {hasTravelers ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <span className={hasTravelers ? "text-slate-700" : "text-amber-700"}>
                          Travelers: {form.getValues("travelers") > 0 ? form.getValues("travelers") : (extractedInfo.travelers || "Not specified")}
                        </span>
                      </div>

                      {(form.getValues("children") || extractedInfo.children) && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-slate-700">
                            Children: {form.getValues("children") || extractedInfo.children}
                          </span>
                        </div>
                      )}

                      {(watchStartDate || watchEndDate) && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-slate-700">
                            Dates: {watchStartDate ? format(watchStartDate, "dd/MM/yyyy") : "?"} - {watchEndDate ? format(watchEndDate, "dd/MM/yyyy") : "?"}
                          </span>
                        </div>
                      )}

                      {extractedInfo.travelStyle && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-slate-700">
                            Style: {extractedInfo.travelStyle}
                          </span>
                        </div>
                      )}

                      {extractedInfo.interests.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="text-slate-700">
                            Interests: {extractedInfo.interests.join(", ")}
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

                    {/* Always show manual option */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowDetailedFields(!showDetailedFields)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 underline font-medium"
                      >
                        {showDetailedFields 
                          ? "Hide detailed fields" 
                          : ((!hasDestination || !hasDays || !hasTravelers) 
                              ? "Fill in missing details manually" 
                              : "Edit or add more details")}
                      </button>
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />
        </section>

        {/* Detailed fields - same as smart form */}
        {showDetailedFields && (
          <section className={`space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_25px_80px_-65px_rgba(15,23,42,0.35)] ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
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
                  <FormItem>
                    <FormLabel>Destination <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Paris, France" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Days <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={field.value || ""}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          field.onChange(Number.isNaN(parsed) ? 0 : parsed);
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="travelers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of adults <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date pickers (optional but encouraged) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date <span className="text-slate-400">(optional)</span></FormLabel>
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
                    <FormLabel>End Date <span className="text-slate-400">(optional)</span></FormLabel>
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

            {/* Additional optional fields */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Additional details (optional)
              </h4>

              {/* Children */}
              <FormField
                control={form.control}
                name="children"
                render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel>Number of Children <span className="text-slate-400">(optional)</span></FormLabel>
                    <FormDescription>
                      Guests under 18. Leave blank if none.
                    </FormDescription>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Child ages if children > 0 */}
              {watchChildren && watchChildren > 0 && (
                <div className="space-y-3">
                  <FormLabel>Ages of Children <span className="text-slate-400">(optional but helpful)</span></FormLabel>
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

              {/* Accessibility */}
              <FormField
                control={form.control}
                name="hasAccessibilityNeeds"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white/90 p-4 mt-6">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Accessibility Requirements
                      </FormLabel>
                      <FormDescription>
                        Enable wheelchair access, elevator availability, and other mobility considerations
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
            </div>
          </section>
        )}

        <section className={`space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_-55px_rgba(15,23,42,0.4)] ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              AI Settings
            </h3>
            <p className="text-sm text-slate-500">
              Choose which AI model will generate your travel plan.
            </p>
          </div>

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => {
              // Map OpenRouter model value to pricing model key for tier checking
              const getPricingModelKey = (openRouterValue: string) => {
                // Map openrouter values to pricing model keys
                const mapping: Record<string, string> = {
                  'google/gemini-2.0-flash-lite-001': 'gemini-2.0-flash',
                  'openai/gpt-4o-mini': 'gpt-4o-mini',
                  'google/gemini-2.5-pro': 'gemini-2.5-pro',
                  'anthropic/claude-3-haiku': 'claude-haiku',
                  'google/gemini-2.5-flash': 'gemini-2.5-flash',
                };
                return mapping[openRouterValue];
              };

              // Group models by availability
              const availableModels = OPENROUTER_MODEL_OPTIONS.filter((option) => {
                const pricingKey = getPricingModelKey(option.value);
                // Skip models without pricing config
                if (!pricingKey) return false;
                // Check if this model exists in our pricing config
                if (!AI_MODELS[pricingKey as keyof typeof AI_MODELS]) return false;
                const pricingModel = AI_MODELS[pricingKey as keyof typeof AI_MODELS];
                return pricingModel.freeAccess || userTier !== 'free';
              });

              const lockedModels = OPENROUTER_MODEL_OPTIONS.filter((option) => {
                const pricingKey = getPricingModelKey(option.value);
                // Skip models without pricing config
                if (!pricingKey) return false;
                if (!AI_MODELS[pricingKey as keyof typeof AI_MODELS]) return false;
                const pricingModel = AI_MODELS[pricingKey as keyof typeof AI_MODELS];
                return !pricingModel.freeAccess && userTier === 'free';
              });

              return (
                <>
                  <FormItem className="max-w-sm">
                    <FormLabel>AI Model</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                        <SelectTrigger className="w-full cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Available Models */}
                          {availableModels.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                Available
                              </div>
                              {availableModels.map((option) => {
                                const pricingKey = getPricingModelKey(option.value);
                                const pricingModel = AI_MODELS[pricingKey as keyof typeof AI_MODELS];
                                return (
                                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                                    <div className="flex items-center justify-between w-full gap-3">
                                      <span>{option.label}</span>
                                      <div className="flex items-center gap-2">
                                        {pricingModel && (
                                          <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                            {pricingModel.badge}
                                          </span>
                                        )}
                                        {userTier === 'payg' && pricingModel && (
                                          <span className="text-xs text-muted-foreground">
                                            {formatCurrency(pricingModel.cost)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </>
                          )}

                          {/* Locked Models */}
                          {lockedModels.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2 pt-2 flex items-center gap-2">
                              <Lock className="size-3.5" />  
                              <span>Premium Models</span>
                              </div>
                              {lockedModels.map((option) => {
                                const pricingKey = getPricingModelKey(option.value);
                                const pricingModel = AI_MODELS[pricingKey as keyof typeof AI_MODELS];
                                return (
                                  <SelectItem key={option.value} value={option.value} disabled className="cursor-not-allowed">
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <div className="flex items-center gap-2">
                                        <Lock className="size-3.5 text-muted-foreground" />
                                        <span className="font-medium">{option.label}</span>
                                      </div>
                                      {pricingModel && (
                                        <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                          {pricingModel.badge}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  
                  {/* Upgrade prompt for locked models - Full width outside the select */}
                  {lockedModels.length > 0 && userTier === 'free' && (
                    <div className="mt-4 p-4 border border-blue-200 bg-blue-50/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Lock className="size-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 mb-1">
                            Unlock Premium AI Models
                          </p>
                          <p className="text-xs text-blue-700 mb-2">
                            Access <strong>Claude Haiku</strong> and <strong>GPT-4o</strong> with 
                            Pay-as-you-go ({formatCurrency(0.3)}-{formatCurrency(0.5)} per plan) 
                            or Pro plan ({formatCurrency(9.99)}/month).
                          </p>
                          <Link
                            href="/pricing"
                            className="inline-block text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                          >
                            View Pricing Plans →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            }}
          />
        </section>

        {/* Cloudflare Turnstile - Bot Protection */}
     
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => {
              setTurnstileToken(null);
              toast.error("Security verification failed", {
                description: "Please refresh the page and try again",
              });
            }}
            onExpire={() => setTurnstileToken(null)}
            options={{
              theme: "light",
              size: "flexible",
            }}
          />
 

        <Button 
          ref={submitButtonRef}
          type="submit" 
          className="w-full h-12 text-base" 
          disabled={isLoading || isExtracting || (hasResult && !isAuthenticated) || !turnstileToken} 
          size="lg"
        >
          {isLoading ? (
            <>
              Generating Your Itinerary...
            </>
          ) : isExtracting ? (
            <>
              <span className="mr-2 animate-pulse">✨</span>
              Analyzing Your Description...
            </>
          ) : (hasResult && !isAuthenticated) ? (
            <>
              <span className="mr-2">🔐</span>
              Sign in to Create Another Plan
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

