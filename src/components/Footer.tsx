import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomInfo {
  name: string;
  cnpj: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
}

export default function Footer() {
  const [customInfo, setCustomInfo] = useState<CustomInfo>({
    name: '',
    cnpj: '',
    address: null,
    phone: null,
    email: null,
    website: null,
    logo_url: null
  });

  useEffect(() => {
    fetchCustomInfo();
  }, []);

  const fetchCustomInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('custom')
        .select('name, cnpj, address, phone, email, website, logo_url')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) throw error;
      if (data) {
        setCustomInfo(data);
      }
    } catch (error) {
      console.error('Erro ao carregar informações:', error);
    }
  };

  return (
    <footer className="bg-white shadow-md mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo e Nome */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center mb-4">
              {customInfo.logo_url ? (
                <img 
                  src={customInfo.logo_url} 
                  alt="Logo" 
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-indigo-600" />
              )}
              <span className="ml-2 text-lg font-semibold text-gray-900">
                {customInfo.name}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              CNPJ: {customInfo.cnpj}
            </p>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Contato
            </h3>
            <div className="space-y-3">
              {customInfo.email && (
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <a href={`mailto:${customInfo.email}`} className="text-sm hover:text-indigo-600">
                    {customInfo.email}
                  </a>
                </div>
              )}
              {customInfo.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <a href={`tel:${customInfo.phone}`} className="text-sm hover:text-indigo-600">
                    {customInfo.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          {customInfo.address && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Endereço
              </h3>
              <div className="flex items-start text-gray-600">
                <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />
                <p className="text-sm">
                  {customInfo.address}
                </p>
              </div>
            </div>
          )}

          {/* Website */}
          {customInfo.website && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Website
              </h3>
              <div className="flex items-center text-gray-600">
                <Globe className="h-4 w-4 mr-2" />
                <a 
                  href={customInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-indigo-600"
                >
                  {customInfo.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {customInfo.name}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}