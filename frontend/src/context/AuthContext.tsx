import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Organization } from '../types';
import { apiClient, ApiError } from '../services/apiClient';
import { useBillingStore } from '../store/useBillingStore';

interface AuthContextType {
  user: User | null;
  activeOrganization: Organization | null;
  activeRole: 'admin' | 'operator' | 'auditor' | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveOrganizationId: (orgId: number) => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [activeRole, setActiveRole] = useState<'admin' | 'operator' | 'auditor' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const resolveActiveOrg = (userData: User, requestedOrgId?: number | null) => {
    const orgs = userData.organizations || [];
    if (orgs.length === 0) {
      setActiveOrganization(null);
      setActiveRole(null);
      return;
    }

    let selected = orgs.find((o) => o.id === requestedOrgId);
    if (!selected) {
      const storedId = localStorage.getItem('active_organization_id');
      selected = orgs.find((o) => o.id === Number(storedId)) || orgs[0];
    }

    setActiveOrganization(selected);
    localStorage.setItem('active_organization_id', String(selected.id));
    setActiveRole(selected.pivot?.role || 'operator');
  };

  const fetchUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiClient.get<User>('/auth/me');
      setUser(data);
      resolveActiveOrg(data);
    } catch {
      setUser(null);
      setActiveOrganization(null);
      setActiveRole(null);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/login', { email, password });
      localStorage.setItem('auth_token', response.token);
      setUser(response.user);
      resolveActiveOrg(response.user);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('active_organization_id');
      setUser(null);
      setActiveOrganization(null);
      setActiveRole(null);
    }
  };

  const setActiveOrganizationId = (orgId: number) => {
    if (user && user.organizations) {
      resolveActiveOrg(user, orgId);
      // Clear Zustand selected client and draft items when switching organizations
      useBillingStore.getState().setSelectedClientId(null);
      useBillingStore.getState().clearDraft();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrganization,
        activeRole,
        isLoading,
        login,
        logout,
        setActiveOrganizationId,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
