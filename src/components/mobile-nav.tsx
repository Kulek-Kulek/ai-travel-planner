'use client';

import { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  Menu, 
  X, 
  Home,
  ClipboardList, 
  User,
  LogIn,
  UserPlus,
  LogOut,
  ListCheck,
  Sparkles,
  Users,
  LayoutDashboard
} from 'lucide-react';
import { signInWithGoogle } from '@/lib/actions/auth-actions';
import { clientSignOut } from '@/lib/auth/client-auth';
import { toast } from 'sonner';

interface MobileNavProps {
  user: { email?: string } | null;
  isAdmin: boolean;
}

export function MobileNav({ user, isAdmin }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = () => setIsOpen(false);

  const handleGoogleSignIn = async () => {
    startTransition(async () => {
      await signInWithGoogle();
    });
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      closeMenu();
      await clientSignOut();
    } catch {
      setIsSigningOut(false);
      toast.error('Failed to sign out', {
        description: 'Please try again',
      });
    }
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`lg:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors ${
          isOpen 
            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile Menu Overlay - Rendered as Portal */}
      {mounted && isOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/60 z-[9999] lg:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />,
        document.body
      )}

      {/* Mobile Menu Slide-out - Rendered as Portal */}
      {mounted && createPortal(
        <div
          className={`fixed top-0 right-0 bottom-0 w-72 bg-white border-l-4 border-blue-500 shadow-2xl transform transition-transform duration-300 ease-in-out z-[99999] lg:hidden ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: '#ffffff', opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="flex flex-col h-full">
            {/* Menu Header */}
            <div className="px-4 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h2 className="text-lg font-semibold">Menu</h2>
            </div>
            
            {/* Navigation Links */}
            <div className="flex-1 px-4 py-6 space-y-1 bg-white">
              {/* Home Link */}
              <Link
                href="/"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Home</span>
              </Link>

              {/* Pricing Link - Always Visible */}
              <Link
                href="/pricing"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 bg-blue-50/50"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Pricing Plans</span>
              </Link>

              {user && (
                <>
                  {isAdmin ? (
                    /* Admin Navigation */
                    <>
                      <Link
                        href="/admin/itineraries"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-semibold">Admin Dashboard</span>
                      </Link>

                      <Link
                        href="/admin/users"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Users className="w-5 h-5" />
                        <span className="font-semibold">User Management</span>
                      </Link>
                    </>
                  ) : (
                    /* Regular User Navigation */
                    <>
                      {/* My Plans */}
                      <Link
                        href="/my-plans"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ClipboardList className="w-5 h-5" />
                        <span className="font-medium">My Plans</span>
                      </Link>

                      {/* Bucket List */}
                      <Link
                        href="/bucket-list"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ListCheck className="w-5 h-5" />
                        <span className="font-medium">Bucket List</span>
                      </Link>

                      {/* Profile */}
                      <Link
                        href="/profile"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <User className="w-5 h-5" />
                        <span className="font-medium">Profile</span>
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Bottom Section - Auth */}
            <div className="border-t border-gray-200 p-4 space-y-3 bg-white" style={{ backgroundColor: '#ffffff' }}>
              {user ? (
                <>
                  {/* User Email */}
                  <div className="px-4 py-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.email || 'User'}
                    </p>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogOut className="w-5 h-5" />
                    {isSigningOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </>
              ) : (
                <>
                  {/* Google Sign-In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isPending}
                    className="flex items-center justify-center gap-3 w-full px-4 py-3 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg transition-colors font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                    {isPending ? 'Signing in...' : 'Continue with Google'}
                  </button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-white text-gray-500">Or use email</span>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <Link
                    href="/sign-in"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </Link>

                  {/* Sign Up Button */}
                  <Link
                    href="/sign-up"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
                  >
                    <UserPlus className="w-5 h-5" />
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>,
        document.body
      )}
    </>
  );
}

