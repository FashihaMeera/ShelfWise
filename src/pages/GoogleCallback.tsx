import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, setTokens } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Handles the Google OAuth implicit-flow redirect.
 * Google redirects back to this page with `#id_token=...` in the URL hash.
 */
export default function GoogleCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");

    if (!idToken) {
      setError("No token received from Google. Please try again.");
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    (async () => {
      try {
        const res = await authApi.googleAuth(idToken);
        setTokens(res.access_token, res.refresh_token);
        await refreshUser();
        navigate("/dashboard");
      } catch (err: any) {
        setError(err.message || "Google authentication failed.");
        setTimeout(() => navigate("/login"), 3000);
      }
    })();
  }, [navigate, refreshUser]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      {error ? (
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Signing you in with Google...</p>
        </div>
      )}
    </div>
  );
}
