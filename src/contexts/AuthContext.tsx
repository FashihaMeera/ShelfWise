import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, getAccessToken, clearTokens, type AuthUser } from "@/lib/api-client";

type AppRole = "admin" | "librarian" | "member";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Minimal user shape expected by the rest of the app */
interface AppUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AppUser | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  /** Re-fetch user data from /auth/me */
  refreshUser: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  refreshUser: async () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateFromApi = useCallback(async () => {
    try {
      const me: AuthUser = await authApi.getMe();
      setUser({ id: me.id, email: me.email });
      setProfile({ id: me.id, full_name: me.full_name, avatar_url: me.avatar_url });
      setRole((me.role as AppRole) || "member");
    } catch {
      // Token invalid / expired / missing — clean up
      clearTokens();
      setUser(null);
      setProfile(null);
      setRole(null);
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      hydrateFromApi().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [hydrateFromApi]);

  const refreshUser = useCallback(async () => {
    await hydrateFromApi();
  }, [hydrateFromApi]);

  const signOut = useCallback(() => {
    clearTokens();
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
