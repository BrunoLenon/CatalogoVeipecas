import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { toast } from 'react-hot-toast';
import { LogIn, Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface CustomSettings {
  name: string;
  logo_url: string | null;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const [customSettings, setCustomSettings] = useState<CustomSettings>({
    name: 'Sistema de Vendas',
    logo_url: null
  });

  useEffect(() => {
    fetchCustomSettings();
  }, []);

  const fetchCustomSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('custom')
        .select('name, logo_url')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) {
        // Se não encontrar configurações, usar valores padrão
        if (error.code === 'PGRST116') {
          // Tentar criar configurações padrão
          const { error: insertError } = await supabase
            .from('custom')
            .insert({
              id: '00000000-0000-0000-0000-000000000001',
              name: 'Sistema de Vendas',
              cnpj: '00.000.000/0001-00'
            });
          
          if (insertError) {
            console.error('Erro ao criar configurações:', insertError);
          }
          return;
        }
        throw error;
      }
      
      if (data) {
        setCustomSettings(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-indigo-600 to-blue-500 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-lg mb-4"
            >
              {customSettings.logo_url ? (
                <img 
                  src={customSettings.logo_url} 
                  alt="Logo" 
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <Building2 className="h-12 w-12 text-indigo-600" />
              )}
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {customSettings.name}
            </h2>
            <p className="text-indigo-100">
              Faça login para acessar sua conta
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                  Lembrar-me
                </label>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2" />
                    Entrando...
                  </div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Entrar
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          {customSettings.name} © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}