'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './types';

// Use env variable, fallback to port 5001 (configured backend port)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Fetch fresh user data from /api/users/:id and return a normalized User object */
async function fetchFreshUser(userId: number, savedToken: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${savedToken}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      roleId: data.roleId,
      roleName: data.role?.name || data.roleName || 'EMPLOYEE',
      departmentId: data.departmentId,
      active: data.active,
      employee: data.employee   // includes nested department + designation
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Refresh user context from latest server data and persist to localStorage */
  const refreshUser = async () => {
    const savedToken = token || localStorage.getItem('auth_token');
    const savedUserStr = localStorage.getItem('auth_user');
    if (!savedToken || !savedUserStr) return;

    const { id } = JSON.parse(savedUserStr);
    const freshUser = await fetchFreshUser(id, savedToken);
    if (freshUser) {
      setUser(freshUser);
      localStorage.setItem('auth_user', JSON.stringify(freshUser));
    }
  };

  // Initialize auth state and immediately sync with backend
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token');
        const savedUserStr = localStorage.getItem('auth_user');

        if (savedToken && savedUserStr) {
          setToken(savedToken);
          // First render with cached data so page isn't blank
          setUser(JSON.parse(savedUserStr));

          // Then sync with server to pick up any department/designation changes
          const { id } = JSON.parse(savedUserStr);
          const freshUser = await fetchFreshUser(id, savedToken);
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem('auth_user', JSON.stringify(freshUser));
          }
        }
      } catch (error) {
        console.error('[Auth] Failed to restore auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    setUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
