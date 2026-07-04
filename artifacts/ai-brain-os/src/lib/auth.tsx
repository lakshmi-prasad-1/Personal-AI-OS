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

  // Registered synchronously during render (not in an effect) so that any
  // child component mounting in the same commit — e.g. the sidebar's
  // current-user fetch right after login/register — always sees the
  // up-to-date token instead of racing a stale effect.
  setAuthTokenGetter(() => token);

  useEffect(() => {
    return () => {
      setAuthTokenGetter(null);
    };
  }, []);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("ai_brain_os_token", newToken);
    } else {
      localStorage.removeItem("ai_brain_os_token");
    }
    setAuthTokenGetter(() => newToken);
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
