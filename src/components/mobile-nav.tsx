'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Menu, 
  X, 
  Home,
  ClipboardList, 
  User, 
  Shield,
  LogIn,
  UserPlus,
  LogOut
} from 'lucide-react';

interface MobileNavProps {
  user: { email: string } | null;
  isAdmin: boolean;
}

export function MobileNav({ user, isAdmin }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

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

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Slide-out */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-72 bg-white border-l-4 border-blue-500 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#ffffff', opacity: 1 }}
      >
        <nav className="flex flex-col h-full bg-white" style={{ backgroundColor: '#ffffff' }}>
          {/* Menu Header */}
          <div className="px-4 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <h2 className="text-lg font-semibold">Menu</h2>
          </div>
          
          {/* Navigation Links */}
          <div className="flex-1 px-4 py-6 space-y-1 bg-white" style={{ backgroundColor: '#ffffff' }}>
            {/* Home Link */}
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </Link>

            {user && (
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

                {/* Profile */}
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </Link>

                {/* Admin Link */}
                {isAdmin && (
                  <Link
                    href="/admin/itineraries"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="font-semibold">Admin</span>
                  </Link>
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
                    {user.email}
                  </p>
                </div>

                {/* Sign Out Button */}
                <form action="/api/auth/signout" method="POST" className="w-full">
                  <button
                    type="submit"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
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
      </div>
    </>
  );
}

