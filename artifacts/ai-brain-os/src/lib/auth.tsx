import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export const AuthContext = createContext<{
  isAuthenticated: boolean;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}>({
  isAuthenticated: false,
  token: null,
  setToken: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem("ai_brain_os_token"));
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("ai_brain_os_token", newToken);
    } else {
      localStorage.removeItem("ai_brain_os_token");
    }
    setTokenState(newToken);
  };

  const logout = () => {
    setToken(null);
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
