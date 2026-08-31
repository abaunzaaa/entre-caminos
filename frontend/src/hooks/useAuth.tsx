import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAccessToken } from "../services/api";
import { getMe, loginAccount, logoutAccount, registerAccount } from "../services/auth.service";
import type { PublicUser } from "../types";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
  }) => Promise<{ user: PublicUser; verificationEmailSent: boolean }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setAccessToken(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const result = await loginAccount({ email, password });
        setUser(result.user);
        const profile = await getMe().catch(() => result.user);
        setUser(profile);
        return profile;
      },
      async register(payload) {
        const result = await registerAccount(payload);
        setUser(result.user);
        const profile = await getMe().catch(() => result.user);
        setUser(profile);
        return {
          user: profile,
          verificationEmailSent: Boolean(result.verificationEmailSent),
        };
      },
      async logout() {
        await logoutAccount();
        setUser(null);
      },
      hasPermission(permission) {
        if (user?.role === "SUPER_ADMIN") {
          return true;
        }
        return Boolean(user?.permissions?.includes(permission));
      },
      isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
