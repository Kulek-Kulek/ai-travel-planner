'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

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
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

type ItineraryFormData = z.infer<typeof itineraryFormSchema>;

interface ItineraryFormProps {
  onSubmit: (data: ItineraryFormData) => void;
  isLoading?: boolean;
}

export const ItineraryForm = ({ onSubmit, isLoading = false }: ItineraryFormProps) => {
  const form = useForm<ItineraryFormData>({
    resolver: zodResolver(itineraryFormSchema),
    defaultValues: {
      destination: '',
      days: 3,
      travelers: 1,
      notes: '',
    },
  });

  const handleFormSubmit = (data: ItineraryFormData) => {
    // Show info toast when form is valid
    toast.info('Validating your travel preferences...', {
      duration: 1000,
    });
    
    onSubmit(data);
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
              <FormLabel>Destination</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Paris, France"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Where would you like to travel?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Days and Travelers in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Number of Days */}
          <FormField
            control={form.control}
            name="days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Days</FormLabel>
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
                <FormDescription>
                  1-30 days
                </FormDescription>
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
                <FormLabel>Number of Travelers</FormLabel>
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
                <FormDescription>
                  Including you
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes / Preferences */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Prepare a 3 day plan to visit Paris starting from afternoon first day and finishing late evening. I'm interested in art museums, local cafes, and romantic spots."
                  rows={5}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Tell the AI about your preferences, interests, dietary needs, or any special requirements (max 500 characters)
              </FormDescription>
              <FormMessage />
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


