'use client';

import { useState, useTransition, useEffect } from 'react';
import { signUp, signInWithGoogle } from '@/lib/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
    }
    
    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setErrors(result.error);
      }
    });
  };

  const handleGoogleSignUp = async () => {
    // Save itineraryId to sessionStorage so it persists through auth redirect
    if (draftId) {
      sessionStorage.setItem('itineraryId', draftId);
    }
    
    startTransition(async () => {
      await signInWithGoogle(draftId);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">
      {/* Background blur effects */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      </div>
      
      {/* Navigation */}
      <div className="w-full max-w-md mb-4 relative z-10">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </div>
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-5 relative z-10 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-xs text-gray-600 mt-1">Sign up to save your itineraries</p>
          <div className="mt-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
            You&apos;ll need to confirm your email
            </p>
          </div>
        </div>

        {/* Google Sign-Up Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full mb-3 flex items-center justify-center gap-3 h-9"
          onClick={handleGoogleSignUp}
          disabled={isPending}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm">{isPending ? 'Signing up...' : 'Continue with Google'}</span>
        </Button>

        {/* Divider */}
        <div className="relative mb-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-3">
          {/* Hidden itineraryId field */}
          {draftId && (
            <input type="hidden" name="itineraryId" value={draftId} />
          )}
          
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Kris, Kris Smith, or any nickname"
              required
              disabled={isPending}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-gray-500">
              Appears on your itineraries
            </p>
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isPending}
              className="h-9 text-sm"
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email[0]}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
              disabled={isPending}
              className="h-9 text-sm"
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password[0]}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
              className="h-9 text-sm"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600">{errors.confirmPassword[0]}</p>
            )}
          </div>

          {/* General errors */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
              {errors.general[0]}
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full h-9 text-sm" disabled={isPending}>
            {isPending ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-3 text-center text-xs text-gray-600">
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


