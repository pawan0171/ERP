import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Profile = { id: string; full_name: string; role: string };

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, sess: Session | null) => {
      setSession(sess);
      if (!sess) setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (data) setProfile(data);
      else {
        const name = session.user.email?.split('@')[0] ?? 'User';
        const { data: created } = await supabase
          .from('profiles')
          .insert({ id: session.user.id, full_name: name })
          .select('id, full_name, role')
          .maybeSingle();
        if (created) setProfile(created);
      }
    })();
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string = 'sales') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, full_name: fullName, role });
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
