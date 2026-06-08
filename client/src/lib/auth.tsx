import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "./api";
import { queryClient } from "./queryClient";
import type { Permission } from "@shared/permissions";
import type { UserRole, PartyType } from "@shared/schema";

export interface AuthUser {
  id: string;
  partyId: string;
  partyType: PartyType;
  branchId: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  locale: string;
  permissions: Permission[];
}

export interface RegisterInput {
  accountType: "business" | "personal";
  companyName?: string;
  name: string;
  email: string;
  password: string;
}

interface AuthValue {
  user: AuthUser | null;
  isLoading: boolean;
  isBusiness: boolean;
  can: (permission: Permission) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const res = await api.get<{ user: AuthUser }>("/auth/me");
        return res.user;
      } catch {
        return null;
      }
    },
  });

  const user = data ?? null;

  const loginMutation = useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      api.post<{ user: AuthUser }>("/auth/login", vars),
    onSuccess: (res) => queryClient.setQueryData(["me"], res.user),
  });

  const registerMutation = useMutation({
    mutationFn: (vars: RegisterInput) => api.post<{ user: AuthUser }>("/auth/register", vars),
    onSuccess: (res) => queryClient.setQueryData(["me"], res.user),
  });

  const value: AuthValue = {
    user,
    isLoading,
    isBusiness: user?.partyType === "business",
    can: (permission) => !!user?.permissions.includes(permission),
    login: async (email, password) => {
      await loginMutation.mutateAsync({ email, password });
    },
    register: async (input) => {
      await registerMutation.mutateAsync(input);
    },
    logout: async () => {
      await api.post("/auth/logout");
      queryClient.setQueryData(["me"], null);
      queryClient.clear();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
