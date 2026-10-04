import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AuthKeyIcon } from "../components/auth/AuthKeyIcon";
import { SuccessConfirmDialog } from "../components/ui/SuccessConfirmDialog";
import {
  clearSession,
  clearSessionExpiredFlag,
  getAccessToken,
  getAccessTokenExpiry,
  getStoredUser,
  peekSessionExpired,
  refreshAccessToken,
  setStoredUser,
  subscribeSessionLoss,
  syncRememberFromLocation,
} from "../services/api";
import {
  getMe,
  loginAccount,
  logoutAccount,
  registerAccount,
  restoreSession,
  changeMyPassword,
  updateMyProfile,
  verifyEmailAccount,
  type UpdateProfileInput,
} from "../services/auth.service";
import type { PublicUser } from "../types";
import { SESSION_ENDED_MESSAGE } from "../utils/api-error";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<PublicUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
  }) => Promise<{ user: PublicUser; verificationEmailSent: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<PublicUser>;
  updateProfile: (payload: UpdateProfileInput) => Promise<PublicUser>;
  changePassword: (payload: {
    currentPassword?: string;
    password: string;
    confirmPassword: string;
  }) => Promise<PublicUser>;
  refresh: () => Promise<PublicUser | null>;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const REFRESH_SKEW_MS = 45_000;
const REFRESH_POLL_MS = 20_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(() => {
    const stored = getStoredUser();
    return stored?.emailVerified ? stored : null;
  });
  const [loading, setLoading] = useState(true);
  const [sessionEndedOpen, setSessionEndedOpen] = useState(() => peekSessionExpired());
  const endingSession = useRef(false);

  useEffect(() => {
    let cancelled = false;

    syncRememberFromLocation();
    restoreSession()
      .then((profile) => {
        if (cancelled) {
          return;
        }
        if (profile) {
          setUser(profile);
          return;
        }
        if (!getAccessToken() && !peekSessionExpired()) {
          setStoredUser(null);
          setUser(null);
        }
      })
      .catch(() => {
        if (!cancelled && !getAccessToken() && !peekSessionExpired()) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeSessionLoss(() => {
      setSessionEndedOpen(true);
    });
  }, []);

  const acknowledgeSessionEnded = useCallback(() => {
    if (endingSession.current) {
      return;
    }
    endingSession.current = true;
    clearSession();
    clearSessionExpiredFlag();
    window.location.replace("/");
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = window.setInterval(() => {
      if (peekSessionExpired()) {
        return;
      }
      const expiry = getAccessTokenExpiry();
      if (!expiry || expiry - Date.now() > REFRESH_SKEW_MS) {
        return;
      }
      void refreshAccessToken({ silent: true });
    }, REFRESH_POLL_MS);

    return () => window.clearInterval(timer);
  }, [user]);

  const refreshUser = useCallback(async () => {
    const profile = await getMe();
    setStoredUser(profile);
    setUser(profile);
    return profile;
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfileInput) => {
    const profile = await updateMyProfile(payload);
    setStoredUser(profile);
    setUser(profile);
    return profile;
  }, []);

  const changePassword = useCallback(
    async (payload: { currentPassword?: string; password: string; confirmPassword: string }) => {
      const profile = await changeMyPassword(payload);
      setStoredUser(profile);
      setUser(profile);
      return profile;
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refreshUser,
      updateProfile,
      changePassword,
      async login(email, password, remember = false) {
        const result = await loginAccount({ email, password, remember });
        setUser(result.user);
        const profile = await getMe().catch(() => result.user);
        setStoredUser(profile);
        setUser(profile);
        return profile;
      },
      async register(payload) {
        const result = await registerAccount(payload);
        if (!result.user.emailVerified) {
          setUser(null);
          return {
            user: result.user,
            verificationEmailSent: Boolean(result.verificationEmailSent),
          };
        }
        setUser(result.user);
        const profile = await getMe().catch(() => result.user);
        setStoredUser(profile);
        setUser(profile);
        return {
          user: profile,
          verificationEmailSent: Boolean(result.verificationEmailSent),
        };
      },
      async verifyEmail(email, code) {
        const result = await verifyEmailAccount({ email, code });
        const profile = await getMe().catch(() => result.user);
        setStoredUser(profile);
        setUser(profile);
        return profile;
      },
      async logout() {
        clearSessionExpiredFlag();
        await logoutAccount();
        window.location.replace("/");
      },
      async refresh() {
        const profile = await getMe();
        setStoredUser(profile);
        setUser(profile);
        return profile;
      },
      hasPermission(permission) {
        if (user?.role === "SUPER_ADMIN") {
          return true;
        }
        return Boolean(user?.permissions?.includes(permission));
      },
      isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
    }),
    [user, loading, refreshUser, updateProfile, changePassword],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SuccessConfirmDialog
        open={sessionEndedOpen}
        onClose={acknowledgeSessionEnded}
        className="contact-success--subtle"
        icon={<AuthKeyIcon className="auth-reset-success__mark" />}
        title="Sesión finalizada"
        description={SESSION_ENDED_MESSAGE}
        actionLabel="OK"
        initialFocus="action"
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
