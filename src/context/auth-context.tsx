import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  AuthContextType,
  LoginCredentials,
  RegisterFormData,
  UserProfile,
} from "@/types/auth";
import { apiLogin, apiRegister } from "@/services/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (
    credentials: LoginCredentials
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await apiLogin(credentials);

      if (response.success && response.token && response.user) {
        setUser(response.user);
        setToken(response.token);
        setIsAuthenticated(true);
        return { success: true };
      }

      return {
        success: false,
        error: response.error || "Login failed. Please check your credentials.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "An unexpected error occurred during login.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    data: RegisterFormData
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await apiRegister(data);

      if (response.success && response.token && response.user) {
        setUser(response.user);
        setToken(response.token);
        setIsAuthenticated(true);
        return { success: true };
      }

      return {
        success: false,
        error: response.error || "Registration failed. Please check your details.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "An unexpected error occurred during registration.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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
