import { redirect } from 'next/navigation';
import { getUser } from '@/lib/actions/auth-actions';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // If user is already signed in, redirect to home
  if (user) {
    redirect('/');
  }

  return <>{children}</>;
}

