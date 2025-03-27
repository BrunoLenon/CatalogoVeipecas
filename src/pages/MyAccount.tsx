import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Mail, 
  Key, 
  Building2, 
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  X,
  Save,
  Lock,
  Edit
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyAccount() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name,
          email
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        return;
      }

      // Verificar senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword
      });

      if (signInError) {
        toast.error('Senha atual incorreta');
        return;
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      toast.success('Senha atualizada com sucesso!');
      setIsPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      toast.error('Erro ao atualizar senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Minha Conta</h2>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Cabeçalho do perfil */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
          <div className="flex items-center">
            <div className="h-20 w-20 rounded-full bg-white/30 flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div className="ml-6">
              <h3 className="text-xl font-semibold text-white">{user?.name}</h3>
              <div className="flex items-center mt-2">
                <Shield className="h-4 w-4 text-white/80 mr-2" />
                <span className="text-sm text-white/80 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informações do perfil */}
        <div className="p-6">
          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-6">
              {/* Status da conta */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${user?.status ? 'bg-green-400' : 'bg-red-400'} mr-2`} />
                  <span className="text-sm font-medium text-gray-700">
                    Status da Conta: {user?.status ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  Criado em: {user?.created_at && formatDate(user.created_at)}
                </div>
              </div>

              {/* Campos do formulário */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                      className={`block w-full pl-10 pr-12 py-2 rounded-md ${
                        isEditing
                          ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    />
                    {!isEditing && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isEditing}
                      className={`block w-full pl-10 py-2 rounded-md ${
                        isEditing
                          ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF/CNPJ
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={user?.cnpj_cpf || ''}
                      disabled
                      className="block w-full pl-10 py-2 rounded-md bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-between items-center pt-6">
                {isEditing ? (
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setName(user?.name || '');
                        setEmail(user?.email || '');
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de alteração de senha */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Alterar Senha
                </h3>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Senha Atual
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nova Senha
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar Nova Senha
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}