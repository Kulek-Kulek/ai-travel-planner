'use client';

import { useState, useTransition, useEffect } from 'react';
import { signUp } from '@/lib/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function SignUpPage() {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [draftId, setDraftId] = useState<string>('');

  // Read itineraryId from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('itineraryId');
    if (id) {
      setDraftId(id);
    }
  }, []);

  const handleSubmit = async (formData: FormData) => {
    // Save itineraryId to sessionStorage so it persists through auth redirect
    if (draftId) {
      sessionStorage.setItem('itineraryId', draftId);
      console.log("🔍 DEBUG: Saved itineraryId to sessionStorage:", draftId);
    }
    
    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setErrors(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Sign up to save your itineraries</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Kris, Kris Smith, or any nickname"
              required
              disabled={isPending}
            />
            <p className="text-xs text-gray-500">
              This will appear on your itineraries (e.g., &quot;by Kris&quot;)
            </p>
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isPending}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email[0]}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
            />
            <p className="text-xs text-gray-500">At least 8 characters</p>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password[0]}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword[0]}</p>
            )}
          </div>

          {/* General errors */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.general[0]}
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link 
            href={draftId ? `/sign-in?itineraryId=${draftId}` : "/sign-in"} 
            className="text-blue-600 hover:underline font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}


