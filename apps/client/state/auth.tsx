import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { setAccessToken } from "../api/client";
import { endpoints, type MeResponse } from "../api/endpoints";
import type { LoginInput, RegisterInput } from "@laundry/shared";
import { sessionStore } from "./storage";

interface AuthState {
  user: MeResponse | null;
  loading: boolean;
  /** true tant que la session persistée n'a pas été restaurée. */
  initializing: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** État d'authentification partagé (web + mobile), avec session persistée. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const refreshMe = useCallback(async () => {
    const me = await endpoints.me();
    setUser(me);
  }, []);

  // Restauration de session au démarrage.
  useEffect(() => {
    (async () => {
      try {
        const { accessToken, refreshToken } = await sessionStore.load();
        if (accessToken) {
          setAccessToken(accessToken);
          try {
            await refreshMe();
          } catch {
            // Token d'accès expiré : on tente un refresh.
            if (refreshToken) {
              const t = await endpoints.refresh(refreshToken);
              setAccessToken(t.accessToken);
              await sessionStore.save(t.accessToken, t.refreshToken);
              await refreshMe();
            } else {
              await sessionStore.clear();
              setAccessToken(null);
            }
          }
        }
      } catch {
        await sessionStore.clear();
        setAccessToken(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, [refreshMe]);

  const login = useCallback(
    async (input: LoginInput) => {
      setLoading(true);
      try {
        const res = await endpoints.login(input);
        setAccessToken(res.accessToken);
        await sessionStore.save(res.accessToken, res.refreshToken);
        await refreshMe();
      } finally {
        setLoading(false);
      }
    },
    [refreshMe]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      setLoading(true);
      try {
        const res = await endpoints.register(input);
        setAccessToken(res.accessToken);
        await sessionStore.save(res.accessToken, res.refreshToken);
        await refreshMe();
      } finally {
        setLoading(false);
      }
    },
    [refreshMe]
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    void sessionStore.clear();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, initializing, login, register, refreshMe, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>.");
  return ctx;
}
