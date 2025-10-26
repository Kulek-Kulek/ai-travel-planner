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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Mail className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h1>
          <p className="text-gray-600">
            We&apos;ve sent a confirmation link to
          </p>
          {email && (
            <p className="text-blue-600 font-medium mt-1">{email}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-blue-600">📧</span>
            Next Steps:
          </h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1.25rem]">1.</span>
              <span>Open your email inbox</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1.25rem]">2.</span>
              <span>Look for an email from AI Travel Planner</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1.25rem]">3.</span>
              <span>Click the confirmation link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1.25rem]">4.</span>
              <span>Choose your plan (Free, Pro, or Pay-as-you-go)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[1.25rem]">5.</span>
              <span>Start creating amazing travel itineraries!</span>
            </li>
          </ol>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">💡 Tip:</span> Can&apos;t find the email? 
            Check your spam or junk folder.
          </p>
        </div>

        {/* Resend Button */}
        <Button
          onClick={handleResend}
          disabled={resendDisabled}
          variant="outline"
          className="w-full mb-4"
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

        {/* Back to Home */}
        <div className="text-center">
          <Link 
            href="/" 
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            Back to Home
          </Link>
        </div>

        {/* Support */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
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

