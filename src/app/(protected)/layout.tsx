import { redirect } from 'next/navigation';
import { getUser } from '@/lib/actions/auth-actions';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // If no user, redirect to sign in
  if (!user) {
    redirect('/sign-in');
  }

  // Don't render any wrapper - let the root layout handle the header
  return <>{children}</>;
}


