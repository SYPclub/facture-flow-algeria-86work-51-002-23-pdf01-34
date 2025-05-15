
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

// User roles
export enum UserRole {
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  SALESPERSON = 'salesperson',
  VIEWER = 'viewer',
}

// User type
export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

// Document type for ownership checks
export type Document = {
  id: string;
  created_by_userid?: string;
};

// Auth context type
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkPermission: (allowedRoles: UserRole[]) => boolean;
  canAccessDocument: (document: Document | null) => boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing user session on mount
  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        if (currentSession?.user) {
          const userData = currentSession.user;
          const userMetadata = userData.user_metadata;
          
          setUser({
            id: userData.id,
            email: userData.email || '',
            name: userMetadata?.name || '',
            role: (userMetadata?.role as UserRole) || UserRole.VIEWER,
          });
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const userData = currentSession.user;
        const userMetadata = userData.user_metadata;
        
        setUser({
          id: userData.id,
          email: userData.email || '',
          name: userMetadata?.name || '',
          role: (userMetadata?.role as UserRole) || UserRole.VIEWER,
        });
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      toast({
        title: 'Login successful',
        description: `Welcome back, ${data.user.user_metadata?.name || data.user.email}!`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: err instanceof Error ? err.message : 'Invalid email or password',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: UserRole.VIEWER // Default role for new users
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Registration successful',
        description: 'Please check your email to verify your account',
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'Unable to create account',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        variant: 'destructive',
        title: 'Logout failed',
        description: 'An error occurred during logout',
      });
    }
  };

  // Check if user has required permissions
  const checkPermission = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  // Check if user can access a document
  const canAccessDocument = (document: Document | null): boolean => {
    if (!user || !document) return false;
    
    // Admins can access all documents
    if (user.role === UserRole.ADMIN) return true;
    
    // For other roles, check if they created the document
    if (document.created_by_userid) {
      return document.created_by_userid === user.id;
    }
    
    // If created_by_userid is not set (legacy documents), allow access by default
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        error,
        login,
        register,
        logout,
        checkPermission,
        canAccessDocument,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
