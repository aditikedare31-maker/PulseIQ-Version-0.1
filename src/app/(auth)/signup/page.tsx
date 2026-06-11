import SignUpPage from "@/features/auth/pages/signup-page";

/**
 * Skip static generation for signup page since it uses client-side context providers.
 * This page will be server-rendered on demand instead of pre-rendered at build time.
 */
export const dynamic = "force-dynamic";

export default function SignUp() {
  return <SignUpPage />;
}
