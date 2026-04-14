import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/react';
import type { User } from '@shared/api/contracts';
import { api } from '../services/api/client.js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { getToken, signOut } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      setUser(null);
      api.setToken(null);
      setIsLoading(false);
      return;
    }

    // Get Clerk session token and set it for API calls
    getToken().then(token => {
      if (token) {
        api.setToken(token);
      }
      // Map Clerk user to app User shape
      const clerkRole = (clerkUser.publicMetadata?.role as string) || 'viewer';
      const isAdmin = clerkRole === 'director' || clerkRole === 'manager';

      setUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || 'Gebruiker',
        role: isAdmin ? 'admin' : 'viewer',
      } as User);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, [clerkUser, clerkLoaded, getToken]);

  // Refresh token periodically (Clerk tokens are short-lived)
  useEffect(() => {
    if (!clerkUser) return;
    const interval = setInterval(() => {
      getToken().then(token => {
        if (token) api.setToken(token);
      });
    }, 50_000); // refresh every 50s (tokens last ~60s)
    return () => clearInterval(interval);
  }, [clerkUser, getToken]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      logout: () => signOut(),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
