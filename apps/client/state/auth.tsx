import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { setAccessToken } from "../api/client";
import { endpoints, type MeResponse } from "../api/endpoints";
import type { LoginInput, RegisterInput } from "@laundry/shared";

interface AuthState {
  user: MeResponse | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * État d'authentification partagé (web + mobile).
 * NB : persistance inter-sessions (AsyncStorage/SecureStore) à ajouter en Phase 8.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshMe = useCallback(async () => {
    const me = await endpoints.me();
    setUser(me);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      setLoading(true);
      try {
        const res = await endpoints.login(input);
        setAccessToken(res.accessToken);
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
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, refreshMe, logout }}
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
