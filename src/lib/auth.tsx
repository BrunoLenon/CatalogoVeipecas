import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import type { User } from '../types/user';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cache = useRef<{
    user: User | null;
    timestamp: number;
  }>({
    user: null,
    timestamp: 0,
  });

  const isCacheValid = useCallback(() => {
    return cache.current.user && (Date.now() - cache.current.timestamp) < CACHE_TTL;
  }, []);

  const checkUser = useCallback(async () => {
    try {
      if (isCacheValid()) {
        setUser(cache.current.user);
        setLoading(false);
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw new Error('Erro ao obter sessão: ' + sessionError.message);

      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0] || 'Novo Usuário',
                role: 'customer' as const,
                cnpj_cpf: '00000000000',
                status: true,
              })
              .select()
              .single();

            if (insertError) throw new Error('Erro ao criar usuário: ' + insertError.message);

            if (newUser) {
              await supabase.auth.updateUser({
                data: { role: newUser.role },
              });

              cache.current = { user: newUser, timestamp: Date.now() };
              setUser(newUser);
              if (window.location.pathname === '/') {
                navigate('/inicio');
              }
            }
          } else {
            throw new Error('Erro ao buscar usuário: ' + error.message);
          }
        } else if (userData) {
          await supabase.auth.updateUser({
            data: { role: userData.role },
          });

          cache.current = { user: userData, timestamp: Date.now() };
          setUser(userData);
          if (window.location.pathname === '/') {
            navigate('/inicio');
          }
        }
      } else {
        setUser(null);
        cache.current = { user: null, timestamp: Date.now() };
        if (window.location.pathname !== '/') {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      toast.error('Erro ao carregar dados do usuário');
      setUser(null);
      cache.current = { user: null, timestamp: Date.now() };
      if (window.location.pathname !== '/') {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, isCacheValid]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const setupAuth = async () => {
      if (!mounted) return;

      await checkUser();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session);

  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    setUser(null);
    cache.current = { user: null, timestamp: Date.now() };
    setLoading(false);
    if (window.location.pathname !== '/') {
      navigate('/');
    }
    return;
  }

  if (!session && event === 'INITIAL_SESSION') {
    if (process.env.NODE_ENV === 'development') console.warn('Sessão inválida. Fazendo signOut automático.');
    await supabase.auth.signOut();
    return;
  }

  if (session?.user) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      checkUser();
    }, 1000);
  }
});

      return () => {
        subscription.unsubscribe();
      };
    };

    setupAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [checkUser]);

  const loginAttempts = useRef<{
    count: number;
    lastAttempt: number;
  }>({
    count: 0,
    lastAttempt: 0,
  });

  const signIn = async (email: string, password: string) => {
    try {
      const now = Date.now();
      const timeSinceLastAttempt = now - loginAttempts.current.lastAttempt;

      if (timeSinceLastAttempt > 30 * 60 * 1000) {
        loginAttempts.current.count = 0;
      }

      if (loginAttempts.current.count >= 5) {
        const waitTime = Math.ceil((30 * 60 * 1000 - timeSinceLastAttempt) / 1000 / 60);
        throw new Error(`Muitas tentativas. Tente novamente em ${waitTime} minutos.`);
      }

      loginAttempts.current.count++;
      loginAttempts.current.lastAttempt = now;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);

      if (data.user) {
        let userRecord;
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          if (userError.code === 'PGRST116') {
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email || '',
                name: data.user.email?.split('@')[0] || 'Novo Usuário',
                role: 'customer' as const,
                cnpj_cpf: '00000000000',
                status: true,
              })
              .select()
              .single();

            if (insertError) throw new Error('Erro ao criar usuário: ' + insertError.message);
            userRecord = newUser;
          } else {
            throw new Error('Erro ao buscar usuário: ' + userError.message);
          }
        } else {
          userRecord = existingUser;
        }

        await supabase.auth.updateUser({
          data: { role: userRecord.role },
        });

        cache.current = { user: userRecord, timestamp: Date.now() };
        setUser(userRecord);
        navigate('/inicio');
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Email ou senha inválidos');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);

      setUser(null);
      cache.current = { user: null, timestamp: 0 };
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};