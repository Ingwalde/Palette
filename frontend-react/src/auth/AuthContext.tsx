import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "../api/auth";
import { queryKeys } from "../api/queryKeys";
import { ApiError, setUnauthorizedHandler } from "../lib/http";
import type { LoginPayload, RegisterPayload, User } from "../types/api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// A logged-out visitor is the normal case, not an error: swallow 401 into `null`.
async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await authApi.getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auth,
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    retry: false,
  });

  // If a token refresh fails deep in the http layer, drop cached auth state.
  useEffect(() => {
    setUnauthorizedHandler(() => queryClient.setQueryData(queryKeys.auth, null));
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  const setUser = (user: User | null) => queryClient.setQueryData(queryKeys.auth, user);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => setUser(user),
  });
  // Registration creates the account but does not start a session (the verification email
  // comes first), so it must not set the current user. Logging in is a separate call.
  const registerMutation = useMutation({ mutationFn: authApi.register });
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      setUser(null);
      queryClient.clear();
    },
  });

  const user = data ?? null;
  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isAdmin: user?.is_admin ?? false,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
