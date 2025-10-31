import { getUser } from '@/lib/actions/auth-actions';
import { isAdmin } from '@/lib/auth/admin';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { HideOnScroll } from '@/components/hide-on-scroll';
import { MobileNav } from '@/components/mobile-nav';
import { SignOutButton } from '@/components/sign-out-button';
import { Plane, Sparkles, Users, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

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
                <nav className="hidden lg:flex items-center space-x-1">
                  {/* Pricing Link - Always Visible */}
                  <Link
                    href="/pricing"
                    className={cn(
                      buttonVariants({ variant: "ghost" }), 
                      "text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5 font-semibold"
                    )}
                  >
                    <Sparkles className="w-4 h-4" />
                    Pricing
                  </Link>
                  
                  {/* User-specific Navigation */}
                  {user && (
                    <>
                      {userIsAdmin ? (
                        /* Admin Navigation */
                        <>
                          <Link
                            href="/admin/itineraries"
                            className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                          </Link>
                          <Link
                            href="/admin/users"
                            className={cn(buttonVariants({ variant: "ghost" }), "gap-1.5")}
                          >
                            <Users className="w-4 h-4" />
                            Users
                          </Link>
                        </>
                      ) : (
                        /* Regular User Navigation */
                        <>
                          <Link
                            href="/my-plans"
                            className={cn(buttonVariants({ variant: "ghost" }))}
                          >
                            My Plans
                          </Link>
                          <Link
                            href="/bucket-list"
                            className={cn(buttonVariants({ variant: "ghost" }))}
                          >
                            Bucket List
                          </Link>
                          <Link
                            href="/profile"
                            className={cn(buttonVariants({ variant: "ghost" }))}
                          >
                            Profile
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </nav>
              </div>

              {/* Desktop Auth Buttons */}
              <div className="hidden lg:flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-sm text-gray-600 max-w-[200px] truncate">
                      {user.email || 'User'}
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


