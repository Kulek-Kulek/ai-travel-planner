'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react';

export default function ConfirmEmailPage() {
  const [email, setEmail] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    // Get email from URL params
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [resendCountdown]);

  const handleResend = async () => {
    setResendDisabled(true);
    setResendCountdown(60);

    // TODO: Implement resend email logic
    // const response = await fetch('/api/auth/resend-confirmation', {
    //   method: 'POST',
    //   body: JSON.stringify({ email }),
    // });

    // For now, just show the countdown
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
          <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 relative z-10 max-h-[calc(100vh-8rem)] overflow-y-auto">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
              <CheckCircle className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Check Your Email
          </h1>
          <p className="text-sm text-gray-600">
            We&apos;ve sent a confirmation link to
          </p>
          {email && (
            <p className="text-blue-600 font-medium mt-1 text-sm truncate">{email}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
            Next Steps:
          </h2>
          <ol className="space-y-1.5 text-xs text-gray-700">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1rem]">1.</span>
              <span>Open your email inbox</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1rem]">2.</span>
              <span>Look for an email from AI Travel Planner</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1rem]">3.</span>
              <span>Click the confirmation link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1rem]">4.</span>
              <span>Choose your plan (Free, Pro, or Pay-as-you-go)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1rem]">5.</span>
              <span>Start creating amazing travel itineraries!</span>
            </li>
          </ol>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-700">
            <span className="font-semibold text-gray-900">Tip:</span> Can&apos;t find the email?
            Check your spam or junk folder.
          </p>
        </div>

        {/* Resend Button */}
        <Button
          onClick={handleResend}
          disabled={resendDisabled}
          variant="outline"
          className="w-full mb-3 h-10"
        >
          {resendDisabled ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Resend in {resendCountdown}s
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend Confirmation Email
            </>
          )}
        </Button>

        {/* Back to Sign In */}
        <div className="text-center mb-3">
          <Link
            href="/sign-in"
            className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
          >
            Back to Sign In
          </Link>
        </div>

        {/* Support */}
        <div className="pt-3 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            Still having trouble?{' '}
            <a
              href="mailto:support@aitravelplanner.com"
              className="text-blue-600 hover:underline font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

