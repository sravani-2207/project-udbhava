import { LotusMark } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router";

/**
 * Role-aware landing point after sign-in. Every account goes to the dashboard
 * for its own role — there is no shared dashboard in version 1.
 */
export default function Dashboard() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <LotusMark className="h-8 w-auto animate-pulse text-primary" />
          <p className="text-xs text-muted-foreground">Opening your workspace…</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!user.role) {
    return <Navigate to="/auth?onboarding=1" replace />;
  }

  if (user.role === "student") {
    return <Navigate to="/student" replace />;
  }

  if (user.role === "organization") {
    return <Navigate to="/org" replace />;
  }

  return <Navigate to="/" replace />;
}
