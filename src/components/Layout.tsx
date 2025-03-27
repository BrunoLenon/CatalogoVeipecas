import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  Home,
  Package,
  Tags,
  ShoppingCart,
  ClipboardList,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Building2,
  Palette
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomSettings {
  name: string;
  logo_url: string | null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

      if (error) throw error;
      if (data) {
        setCustomSettings(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const menuItems = [
    { path: '/home', label: 'Início', icon: Home },
    { path: '/produtos', label: 'Produtos', icon: Package },
    { path: '/categorias', label: 'Categorias', icon: Tags },
    { path: '/carrinho', label: 'Carrinho', icon: ShoppingCart },
    { path: '/pedidos', label: 'Pedidos', icon: ClipboardList },
    { path: '/configuracoes', label: 'Usuários', icon: Settings, roles: ['master', 'admin'] },
    { path: '/personalizacao', label: 'Personalização', icon: Palette, roles: ['master', 'admin'] },
    { path: '/minha-conta', label: 'Minha Conta', icon: User },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredMenuItems = menuItems.filter(
    item => !item.roles || (user?.role && item.roles.includes(user.role))
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Barra de navegação superior */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                {customSettings.logo_url ? (
                  <img 
                    src={customSettings.logo_url} 
                    alt="Logo" 
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-indigo-600" />
                )}
                <span className="ml-2 text-lg font-semibold text-gray-900">
                  {customSettings.name}
                </span>
              </div>
              
              {/* Menu desktop */}
              <div className="hidden md:ml-6 md:flex md:space-x-4">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                        location.pathname === item.path
                          ? 'text-indigo-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-1.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Botões direita */}
            <div className="flex items-center">
              <button
                onClick={handleSignOut}
                className="hidden md:flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-5 w-5 mr-1.5" />
                Sair
              </button>

              {/* Botão menu mobile */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-2 text-base font-medium ${
                      location.pathname === item.path
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sair
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}