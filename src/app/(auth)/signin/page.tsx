import SignInPage from "@/features/auth/pages/signin-page";

/**
 * Skip static generation for signin page since it uses client-side context providers.
 * This page will be server-rendered on demand instead of pre-rendered at build time.
 */
export const dynamic = "force-dynamic";

export default function SignIn() {
  return <SignInPage />;
}
