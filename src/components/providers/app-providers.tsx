"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/auth-context";
// Not needed until monitoring/logging is ready.
// import { initObservability } from "@/lib/observability";

// Not needed until we start API/data fetching with React Query.
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 1000 * 60 * 5, // 5 minutes
//       refetchOnWindowFocus: false,
//       retry: 1,
//     },
//   },
// });

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Not needed until observability is implemented.
  // useEffect(() => {
  //   initObservability();
  // }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {children}
        <Toaster position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}