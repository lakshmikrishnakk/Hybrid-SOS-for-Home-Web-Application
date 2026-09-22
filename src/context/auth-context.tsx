import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  AuthContextType,
  LoginCredentials,
  RegisterFormData,
  UserProfile,
} from "@/types/auth";

interface StoredAccount extends UserProfile {
  password: string;
}

// Pre-seeded demo account for rapid testing
const INITIAL_DEMO_ACCOUNTS: StoredAccount[] = [
  {
    id: "demo-user-1",
    fullName: "Officer Alex Taylor",
    email: "demo@hybridsos.com",
    phoneNumber: "+1 (555) 234-5678",
    password: "Password123",
    createdAt: new Date().toISOString(),
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<StoredAccount[]>(INITIAL_DEMO_ACCOUNTS);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = (credentials: LoginCredentials): { success: boolean; error?: string } => {
    const trimmedEmail = credentials.email.trim().toLowerCase();
    const trimmedPassword = credentials.password.trim();

    if (!trimmedEmail) {
      return { success: false, error: "Email is required." };
    }

    if (!trimmedPassword) {
      return { success: false, error: "Password is required." };
    }

    const matched = accounts.find(
      (acc) => acc.email.toLowerCase() === trimmedEmail && acc.password === trimmedPassword
    );

    if (!matched) {
      return {
        success: false,
        error: "Invalid email or password. Please check your credentials.",
      };
    }

    const userProfile: UserProfile = {
      id: matched.id,
      fullName: matched.fullName,
      email: matched.email,
      phoneNumber: matched.phoneNumber,
      createdAt: matched.createdAt,
    };

    setUser(userProfile);
    setIsAuthenticated(true);
    return { success: true };
  };

  const register = (data: RegisterFormData): { success: boolean; error?: string } => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const trimmedFullName = data.fullName.trim();
    const trimmedPhone = data.phoneNumber.trim();
    const trimmedPassword = data.password.trim();

    const existing = accounts.find((acc) => acc.email.toLowerCase() === trimmedEmail);
    if (existing) {
      return {
        success: false,
        error: "An account with this email address already exists.",
      };
    }

    const newAccount: StoredAccount = {
      id: `user-${Date.now()}`,
      fullName: trimmedFullName,
      email: trimmedEmail,
      phoneNumber: trimmedPhone,
      password: trimmedPassword,
      createdAt: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev, newAccount]);

    const userProfile: UserProfile = {
      id: newAccount.id,
      fullName: newAccount.fullName,
      email: newAccount.email,
      phoneNumber: newAccount.phoneNumber,
      createdAt: newAccount.createdAt,
    };

    setUser(userProfile);
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
