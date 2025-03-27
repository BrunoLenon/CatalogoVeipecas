import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
  Palette, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Save, 
  AlertTriangle, 
  Loader2, 
  Layout as LayoutIcon, 
  LogIn, 
  ListTree,
  Globe2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import ImageUploader from '../components/ImageUploader';

interface SystemSettings {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  favicon_url: string;
  site_title: string;
  updated_at: string;
}

type TabType = 'header' | 'login' | 'footer' | 'site';

const DEFAULT_ID = '00000000-0000-0000-0000-000000000001';

export default function SystemCustomization() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('site');
  const [settings, setSettings] = useState<SystemSettings>({
    id: DEFAULT_ID,
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    favicon_url: '',
    site_title: '',
    updated_at: new Date().toISOString()
  });

  const canManageSettings = user?.role === 'master' || user?.role === 'admin';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom')
        .select('*')
        .eq('id', DEFAULT_ID)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found, create default settings
          const { data: newData, error: insertError } = await supabase
            .from('custom')
            .insert({
              id: DEFAULT_ID,
              name: 'Sistema de Vendas',
              cnpj: '00.000.000/0001-00',
              site_title: 'Sistema de Vendas'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          if (newData) setSettings(newData);
        } else {
          throw error;
        }
      } else if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Erro ao carregar configurações do sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;

    try {
      setSaving(true);

      // Validate required fields
      if (!settings.name.trim()) {
        toast.error('Nome do sistema é obrigatório');
        return;
      }

      if (!settings.cnpj.trim()) {
        toast.error('CNPJ é obrigatório');
        return;
      }

      // Validate email format if provided
      if (settings.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(settings.email)) {
        toast.error('Email inválido');
        return;
      }

      // Validate website format if provided
      if (settings.website && !/^https?:\/\/.+/i.test(settings.website)) {
        toast.error('Website deve começar com http:// ou https://');
        return;
      }

      const { error } = await supabase
        .from('custom')
        .upsert({
          id: DEFAULT_ID,
          name: settings.name.trim(),
          cnpj: settings.cnpj.trim(),
          address: settings.address?.trim(),
          phone: settings.phone?.trim(),
          email: settings.email?.trim(),
          website: settings.website?.trim(),
          logo_url: settings.logo_url,
          favicon_url: settings.favicon_url,
          site_title: settings.site_title?.trim() || settings.name.trim()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      toast.success('Configurações atualizadas com sucesso!');
      fetchSettings();

      // Update page title if on site tab
      if (activeTab === 'site' && settings.site_title) {
        document.title = settings.site_title;
      }

      // Update favicon if provided
      if (activeTab === 'site' && settings.favicon_url) {
        const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (favicon) {
          favicon.href = settings.favicon_url;
        }
      }
    } catch (error: any) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error(error.message || 'Erro ao atualizar configurações');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: typeof Building2 }[] = [
    { id: 'site', label: 'Site', icon: Globe2 },
    { id: 'header', label: 'Barra Superior', icon: LayoutIcon },
    { id: 'login', label: 'Página de Login', icon: LogIn },
    { id: 'footer', label: 'Rodapé', icon: ListTree }
  ];

  if (!canManageSettings) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acesso Restrito
          </h2>
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Palette className="h-8 w-8 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">
          Personalização do Sistema
        </h2>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                flex items-center px-4 py-2 text-sm font-medium rounded-lg
                ${activeTab === id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Icon className="h-5 w-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow rounded-lg overflow-hidden"
      >
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Conteúdo da aba Site */}
            {activeTab === 'site' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Favicon
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      {settings.favicon_url ? (
                        <img
                          src={settings.favicon_url}
                          alt="Favicon"
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center">
                          <Globe2 className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <ImageUploader
                        onUpload={(url) => setSettings({ ...settings, favicon_url: url })}
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Ícone que aparece na aba do navegador (recomendado: 32x32 pixels)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Título do Site
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={settings.site_title || settings.name}
                      onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Título que aparece na aba do navegador"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Se não definido, será usado o nome do sistema
                  </p>
                </div>
              </div>
            )}

            {/* Conteúdo da aba Barra Superior */}
            {activeTab === 'header' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo do Sistema
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      {settings.logo_url ? (
                        <img
                          src={settings.logo_url}
                          alt="Logo do sistema"
                          className="h-12 w-12 object-contain rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <ImageUploader
                        onUpload={(url) => setSettings({ ...settings, logo_url: url })}
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Logo que aparecerá na barra superior
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome do Sistema
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Nome que aparecerá na barra superior"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da aba Página de Login */}
            {activeTab === 'login' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo da Página de Login
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      {settings.logo_url ? (
                        <img
                          src={settings.logo_url}
                          alt="Logo do login"
                          className="h-24 w-24 object-contain rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Building2 className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <ImageUploader
                        onUpload={(url) => setSettings({ ...settings, logo_url: url })}
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Logo que aparecerá na página de login
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome do Sistema no Login
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Nome que aparecerá na página de login"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da aba Rodapé */}
            {activeTab === 'footer' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      value={settings.cnpj}
                      onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
                      className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="00.000.000/0001-00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Telefone
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={settings.phone || ''}
                        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={settings.email || ''}
                        onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="contato@empresa.com.br"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Website
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        value={settings.website || ''}
                        onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://www.empresa.com.br"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Endereço
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={settings.address || ''}
                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Endereço completo"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Última atualização e botões */}
            <div className="pt-6 border-t space-y-4">
              <div className="text-sm text-gray-500">
                Última atualização: {new Date(settings.updated_at).toLocaleString()}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}