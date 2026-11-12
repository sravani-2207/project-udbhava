import { useAuth } from "@/hooks/use-auth";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router";

/**
 * Second gate behind RequireAuth: the signed-in person must hold the right role.
 * Missing roles are sent through onboarding on the auth screen; the wrong role
 * is sent to its own dashboard rather than shown a dead end.
 */
export function RequireRole({
  role,
  children,
}: {
  role: "student" | "organization";
  children: ReactNode;
}) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!user.role) {
    return <Navigate to="/auth?onboarding=1" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/" replace />;
  }

  if (user.role !== role) {
    return (
      <Navigate to={user.role === "student" ? "/student" : "/org"} replace />
    );
  }

  return children;
}
