"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AUTHENTICATION_EXPIRED_EVENT, authApi, setAccessToken } from "@/lib/api-client";
import { useToast } from "@/components/providers/toast-provider";
import type { ProfileResponse } from "@/types/api";

type AuthStatus = "loading" | "authenticated" | "anonymous";
interface AuthContextValue {
  status: AuthStatus;
  profile: ProfileResponse | null;
  login: (email: string, password: string) => Promise<ProfileResponse>;
  loginWithGoogle: (idToken: string) => Promise<ProfileResponse>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<ProfileResponse>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { show } = useToast();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const booted = useRef(false);

  const refreshProfile = useCallback(async () => {
    const next = await authApi.profile();
    setProfile(next);
    setStatus("authenticated");
    return next;
  }, []);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void authApi
      .refresh()
      .then(refreshProfile)
      .catch(() => {
        setAccessToken(null);
        setProfile(null);
        setStatus("anonymous");
      });
  }, [refreshProfile]);

  useEffect(() => {
    const handleAuthenticationExpired = () => {
      setAccessToken(null);
      setProfile(null);
      setStatus("anonymous");
      show("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.", "error");
    };
    window.addEventListener(AUTHENTICATION_EXPIRED_EVENT, handleAuthenticationExpired);
    return () =>
      window.removeEventListener(AUTHENTICATION_EXPIRED_EVENT, handleAuthenticationExpired);
  }, [show]);

  const completeLogin = useCallback(
    async (tokenPromise: Promise<{ accessToken: string }>) => {
      const token = await tokenPromise;
      setAccessToken(token.accessToken);
      return refreshProfile();
    },
    [refreshProfile],
  );
  const login = useCallback(
    (email: string, password: string) => completeLogin(authApi.login(email, password)),
    [completeLogin],
  );
  const loginWithGoogle = useCallback(
    (idToken: string) => completeLogin(authApi.google(idToken)),
    [completeLogin],
  );
  const register = useCallback(
    (email: string, password: string, displayName: string) =>
      authApi.register(email, password, displayName),
    [],
  );
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setProfile(null);
      setStatus("anonymous");
    }
  }, []);
  const value = useMemo(
    () => ({ status, profile, login, loginWithGoogle, register, logout, refreshProfile }),
    [status, profile, login, loginWithGoogle, register, logout, refreshProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
