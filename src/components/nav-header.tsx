import { getUser, signOut } from '@/lib/actions/auth-actions';
import { isAdmin } from '@/lib/auth/admin';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ✈️ AI Travel Planner
            </Link>
            {user && (
              <nav className="flex space-x-4">
                <Link
                  href="/my-plans"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  My Plans
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                {userIsAdmin && (
                  <Link
                    href="/admin/itineraries"
                    className="text-red-600 hover:text-red-800 px-3 py-2 rounded-md text-sm font-medium font-semibold"
                  >
                    🛡️ Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{user.email}</span>
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
        </div>
      </div>
    </header>
  );
}


