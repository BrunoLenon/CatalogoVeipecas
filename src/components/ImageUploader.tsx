import { useState } from 'react';
import { storage } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Upload, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (url: string) => void;
  className?: string;
}

export default function ImageUploader({ onUpload, className = '' }: ImageUploaderProps) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não suportado. Use JPG, PNG ou WebP.');
        return;
      }

      // Validar tamanho (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo: 5MB');
        return;
      }

      setLoading(true);

      // Upload do arquivo
      const publicUrl = await storage.upload(
        storage.buckets.systemImages,
        file
      );

      onUpload(publicUrl);
      toast.success('Imagem carregada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao carregar imagem:', error);
      toast.error(error.message || 'Erro ao carregar imagem');
    } finally {
      setLoading(false);
      // Limpar input
      event.target.value = '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={loading}
      />
      <button
        type="button"
        className={`w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Carregando...
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 mr-2" />
            Carregar Imagem
          </>
        )}
      </button>
    </div>
  );
}