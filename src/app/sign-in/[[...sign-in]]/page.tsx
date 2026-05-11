/** File: Sign-in route that renders Clerk's hosted authentication widget for dashboard access. */
import { SignIn } from '@clerk/nextjs';

/**
 * Renders the sign-in screen and enforces redirect to dashboard on success.
 * @returns Sign-in page UI.
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            footerAction: { display: 'none' },
            footer: { display: 'none' },
          },
        }}
      />
    </div>
  );
}
