/** File: Root route that redirects authenticated users to dashboard and guests to sign-in. */
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Handles root path routing based on Clerk authentication status.
 * @returns Redirect response to dashboard or sign-in.
 */
export default async function RootPage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  } else {
    redirect('/sign-in');
  }
}
