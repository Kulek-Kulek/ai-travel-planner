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
const itineraryFormSchema = z.object({
  destination: z
    .string()
    .min(2, 'Destination must be at least 2 characters')
    .max(100, 'Destination must be less than 100 characters'),
  days: z
    .number()
    .int('Number of days must be a whole number')
    .min(1, 'Trip must be at least 1 day')
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
}).refine(
  (data) => {
    // If children > 0, require child ages
    if (data.children && data.children > 0) {
      return data.childAges && data.childAges.length === data.children;
    }
    return true;
  },
  {
    message: 'Please provide ages for all children',
    path: ['childAges'],
  }
);

export type ItineraryFormData = z.infer<typeof itineraryFormSchema>;

interface ItineraryFormProps {
  onSubmit: (data: ItineraryFormData) => void;
  isLoading?: boolean;
}

export const ItineraryForm = ({ onSubmit, isLoading = false }: ItineraryFormProps) => {
  const [childAgesInput, setChildAgesInput] = useState<string[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  const form = useForm<ItineraryFormData>({
    resolver: zodResolver(itineraryFormSchema),
    defaultValues: {
      destination: '',
      days: 3,
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
    if (watchChildren && watchChildren > 0) {
      setChildAgesInput(Array(watchChildren).fill(''));
      form.setValue('childAges', []);
    } else {
      setChildAgesInput([]);
      form.setValue('childAges', []);
    }
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
        {/* Destination */}
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Where would you like to travel? <span className="text-red-500">*</span>
              </FormLabel>
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

        {/* Notes / Preferences */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tell the AI about your preferences, interests, dietary needs, or any special requirements (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Prepare a 3 day plan to visit Paris starting from afternoon first day and finishing late evening. I'm interested in art museums, local cafes, and romantic spots."
                  rows={8}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Range Picker (Optional) */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Travel Dates (Optional)</h3>
          <p className="text-sm text-gray-500">
            Select dates to automatically calculate trip duration
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          field.onChange(date);
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
                          if (date) {
                            field.onChange(date);
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

        {/* Days and Travelers in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Number of Days */}
          <FormField
            control={form.control}
            name="days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Number of Days <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Number of Travelers */}
          <FormField
            control={form.control}
            name="travelers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Number of adults (18+) <span className="text-red-500">*</span>
                </FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Children (Optional) */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="children"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Children (Optional)</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Child Ages (Conditional) */}
          {watchChildren && watchChildren > 0 && (
            <div className="space-y-3">
              <FormLabel>
                Ages of Children <span className="text-red-500">*</span>
              </FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                        .filter(age => age !== '')
                        .map(age => parseInt(age));
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
              {form.formState.errors.childAges && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.childAges.message}
                </p>
              )}
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


