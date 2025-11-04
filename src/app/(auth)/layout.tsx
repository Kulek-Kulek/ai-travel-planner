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

  // Wrapping with a marker class to hide header/footer via CSS
  return <div className="auth-page-wrapper">{children}</div>;
}


