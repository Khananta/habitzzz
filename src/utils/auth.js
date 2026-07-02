'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cek Supabase session saat inisialisasi
    async function checkSupabaseSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            email: session.user.email,
            id: session.user.id,
            user_metadata: session.user.user_metadata || {},
          });
        }
      } catch (err) {
        console.error('Error checking supabase session:', err);
      } finally {
        setLoading(false);
      }
    }

    checkSupabaseSession();

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ? {
        email: session.user.email,
        id: session.user.id,
        user_metadata: session.user.user_metadata || {},
      } : null;

      setUser(prevUser => {
        if (!prevUser && !newUser) return null;
        if (!prevUser || !newUser) return newUser;
        if (prevUser.id !== newUser.id || prevUser.email !== newUser.email) {
          return newUser;
        }
        return prevUser; // Keep same reference to prevent unnecessary layout re-renders on focus
      });
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { data: null, error };
    }

    const supabaseUser = {
      email: data.user.email,
      id: data.user.id,
      user_metadata: data.user.user_metadata || {},
    };
    setUser(supabaseUser);
    return { data: { user: supabaseUser }, error: null };
  };

  const register = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { data: null, error };
    }

    const supabaseUser = data.user ? {
      email: data.user.email,
      id: data.user.id,
      user_metadata: data.user.user_metadata || {},
    } : null;

    return { data: { user: supabaseUser, session: data.session }, error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
