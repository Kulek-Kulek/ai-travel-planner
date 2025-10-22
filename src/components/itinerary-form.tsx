'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

// Validation schema
const itineraryFormSchema = z
  .object({
    destination: z
      .string()
      .min(2, 'Destination must be at least 2 characters')
      .max(100, 'Destination must be less than 100 characters'),
    days: z
      .number({ message: 'Trip length must be a number' })
      .int('Number of days must be a whole number')
      .min(0, 'Trip length cannot be negative')
      .max(30, 'Trip cannot exceed 30 days'),
    travelers: z
      .number()
      .int('Number of travelers must be a whole number')
      .min(1, 'At least 1 traveler required')
      .max(20, 'Maximum 20 travelers allowed'),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    children: z
      .number()
      .int()
      .min(0)
      .max(10, 'Maximum 10 children allowed')
      .optional(),
    childAges: z.array(z.number().int().min(0).max(17)).optional(),
    hasAccessibilityNeeds: z.boolean().optional(),
    notes: z
      .string()
      .max(500, 'Notes must be less than 500 characters')
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasDates = Boolean(data.startDate && data.endDate);
    const hasDays = data.days > 0;

    if (!hasDays && !hasDates) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide the number of days or choose both a start and end date.',
        path: ['days'],
      });
    }

    if ((data.startDate && !data.endDate) || (!data.startDate && data.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select both start and end dates or leave both empty.',
        path: ['endDate'],
      });
    }
  });

export type ItineraryFormData = z.infer<typeof itineraryFormSchema>;

interface ItineraryFormProps {
  onSubmit: (data: ItineraryFormData) => void;
  isLoading?: boolean;
}

export const ItineraryForm = ({ onSubmit, isLoading = false }: ItineraryFormProps) => {
  const [childAgesInput, setChildAgesInput] = useState<string[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const tripLengthPresets = [3, 5, 7, 10];
  const travelerPresets = [1, 2, 4, 6];
  
  const form = useForm<ItineraryFormData>({
    resolver: zodResolver(itineraryFormSchema),
    defaultValues: {
      destination: '',
      days: 0,
      travelers: 1,
      children: undefined,
      childAges: [],
      hasAccessibilityNeeds: false,
      notes: '',
    },
  });

  const watchChildren = form.watch('children');
  const watchStartDate = form.watch('startDate');
  const watchEndDate = form.watch('endDate');

  // Auto-calculate days when dates are selected
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      const daysDiff = differenceInDays(watchEndDate, watchStartDate) + 1;
      if (daysDiff > 0 && daysDiff <= 30) {
        form.setValue('days', daysDiff);
      }
    }
  }, [watchStartDate, watchEndDate, form]);

  // Update child ages input fields when number of children changes
  useEffect(() => {
    if (!watchChildren || watchChildren <= 0) {
      setChildAgesInput([]);
      form.setValue('childAges', []);
      return;
    }

    const nextLength = watchChildren;
    setChildAgesInput((prev) => {
      const next = [...prev];
      next.length = nextLength;
      for (let i = 0; i < nextLength; i += 1) {
        if (typeof next[i] === 'undefined') {
          next[i] = '';
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
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' '),
      children: data.children ?? 0, // Convert undefined to 0 for submission
      childAges: data.childAges ?? [], // Ensure childAges is an array
    };
    
    onSubmit(capitalizedData);
  };

  const handleFormError = () => {
    // Show error toast when validation fails
    toast.error('Please fix the errors in the form', {
      description: 'Check the highlighted fields and try again',
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit, handleFormError)}
        className="space-y-6"
      >
        {/* Trip Brief */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold text-slate-900">
                Describe your ideal trip
              </FormLabel>
              <FormDescription className="text-sm text-slate-500">
                Prefer to brief the AI directly? Share destinations, dates, travel style, must-see moments, or any constraints in your own words.
              </FormDescription>
              <FormControl>
                <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-1 shadow-[0_20px_60px_-45px_rgba(79,70,229,0.75)]">
                  <Textarea
                    placeholder="e.g., Craft a relaxed 6-day escape in Kyoto and Osaka for two food lovers. Include tea ceremonies, hidden ramen bars, and a day trip to Nara."
                    rows={10}
                    className="min-h-[200px] resize-y rounded-[26px] border-0 bg-white/90 px-5 py-4 text-base leading-7 text-slate-900 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-0"
                    {...field}
                    disabled={isLoading}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Trip Essentials */}
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_25px_80px_-65px_rgba(15,23,42,0.35)]">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Trip essentials
            </h3>
            <p className="text-sm text-slate-500">
              Tell us the destination, travelers, and either how long the trip lasts or the exact dates. Provide at least one of those two to continue.
            </p>
          </div>

          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Where would you like to travel? <span className="text-red-500">*</span>
                </FormLabel>
                <FormDescription>
                  City, region, or country. We’ll take care of the rest.
                </FormDescription>
                <FormControl>
                  <Input
                    placeholder="e.g., Paris, France"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-1">
            {/* Number of Days */}
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
                      Between 1 and 30 days. Leave blank if you pick travel dates instead.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={field.value || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tripLengthPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => form.setValue('days', preset)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          form.watch('days') === preset
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                        }`}
                        disabled={isLoading}
                      >
                        {preset} days
                      </button>
                    ))}
                  </div>
                  <div className="mt-auto pt-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {/* Number of Travelers */}
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
                      Max 20 travelers. Include everyone joining the trip.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {travelerPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => form.setValue('travelers', preset)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          form.watch('travelers') === preset
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                        }`}
                        disabled={isLoading}
                      >
                        {preset}
                      </button>
                    ))}
                    <span className="text-xs text-slate-400">Need more? Just type it.</span>
                  </div>
                  <div className="mt-auto pt-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-900">
              Travel dates (optional)
            </h4>
            <p className="text-sm text-slate-500">
              Selecting both start and end dates will auto-fill the trip length.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
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
                            console.log('Start date selected:', date);
                            field.onChange(date ?? undefined);
                            if (date) {
                              setStartDateOpen(false);
                            }
                          }}
                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
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
                            console.log('End date selected:', date);
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
          </div>
        </div>

        {/* Children (Optional) */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="children"
              render={({ field }) => (
                <FormItem className="flex h-full flex-col">
                  <div className="space-y-1">
                    <FormLabel>Children (Optional)</FormLabel>
                    <FormDescription>
                      Add guests under 18 so we can suggest family-friendly picks.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={field.value && field.value > 0 ? field.value : ''}
                      onChange={(e) => {
                        const numValue = parseInt(e.target.value);
                        const value = e.target.value === '' || isNaN(numValue) || numValue === 0 ? undefined : numValue;
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

          {/* Child Ages (Conditional) */}
          {watchChildren && watchChildren > 0 && (
            <div className="space-y-3">
              <FormLabel>Ages of Children (optional but helpful)</FormLabel>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: watchChildren }, (_, index) => (
                  <Select
                    key={index}
                    value={childAgesInput[index] || ''}
                    onValueChange={(value) => {
                      const newAges = [...childAgesInput];
                      newAges[index] = value;
                      setChildAgesInput(newAges);

                      // Update form value
                      const ages = newAges
                        .filter((age) => age !== '')
                        .map((age) => parseInt(age));
                      form.setValue('childAges', ages);
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Child ${index + 1} age`} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 17 }, (_, i) => i + 1).map((age) => (
                        <SelectItem key={age} value={age.toString()}>
                          {age} {age === 1 ? 'year' : 'years'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Accessibility Needs */}
        <FormField
          control={form.control}
          name="hasAccessibilityNeeds"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
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

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
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


