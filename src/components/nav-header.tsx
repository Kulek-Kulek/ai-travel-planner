import { getUser, signOut } from '@/lib/actions/auth-actions';
import { isAdmin } from '@/lib/auth/admin';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { HideOnScroll } from '@/components/hide-on-scroll';
import { MobileNav } from '@/components/mobile-nav';
import { Plane, Shield } from 'lucide-react';

async function SignOutButton() {
  return (
    <form action={signOut}>
      <Button variant="outline" size="sm" type="submit">
        Sign Out
      </Button>
    </form>
  );
}

export async function NavHeader() {
  const user = await getUser();
  const userIsAdmin = user ? await isAdmin() : false;

  return (
    <>
      <HideOnScroll height={64}>
        <header className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-[30]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <Plane className="w-6 h-6 text-blue-600" />
                  <span className="hidden sm:inline">AI Travel Planner</span>
                  <span className="sm:hidden">Travel AI</span>
                </Link>
                
                {/* Desktop Navigation */}
                {user && (
                  <nav className="hidden lg:flex space-x-4">
                    <Link
                      href="/my-plans"
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      My Plans
                    </Link>
                    <Link
                      href="/profile"
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Profile
                    </Link>
                    {userIsAdmin && (
                      <Link
                        href="/admin/itineraries"
                        className="flex items-center gap-1.5 text-red-600 hover:text-red-800 px-3 py-2 rounded-md text-sm font-medium font-semibold transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        Admin
                      </Link>
                    )}
                  </nav>
                )}
              </div>

              {/* Desktop Auth Buttons */}
              <div className="hidden lg:flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-sm text-gray-600 max-w-[200px] truncate">
                      {user.email}
                    </span>
                    <SignOutButton />
                  </>
                ) : (
                  <>
                    <Link href="/sign-in">
                      <Button variant="ghost" size="sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/sign-up">
                      <Button size="sm">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu */}
              <MobileNav 
                user={user} 
                isAdmin={userIsAdmin}
              />
            </div>
          </div>
        </header>
      </HideOnScroll>
      {/* Spacer to offset fixed header height */}
      <div className="h-16" />
    </>
  );
}


