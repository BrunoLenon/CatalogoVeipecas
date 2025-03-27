import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Building2, 
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  UserPlus,
  Mail,
  Key,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import type { User, UserRole } from '../types/user';

const roleLabels: Record<UserRole, string> = {
  master: 'Master',
  admin: 'Administrador',
  seller: 'Vendedor',
  customer: 'Cliente'
};

const roleColors: Record<UserRole, string> = {
  master: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  seller: 'bg-green-100 text-green-800',
  customer: 'bg-gray-100 text-gray-800'
};

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer' as UserRole,
    cnpj_cpf: '',
    seller_id: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const canManageSettings = currentUser?.role === 'master' || currentUser?.role === 'admin';
  const canManageAdmins = currentUser?.role === 'master';

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      let query = supabase.from('users').select('*');

      if (currentUser?.role === 'admin') {
        query = query.neq('role', 'master');
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
  
    let loadingToast: string | undefined;
    
    try {
      setIsSubmitting(true);
      loadingToast = toast.loading(selectedUser ? 'Atualizando usuário...' : 'Criando usuário...');
  
      // Validações
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email)) {
        toast.dismiss(loadingToast);
        toast.error('Por favor, insira um email válido');
        return;
      }
  
      if (!userFormData.name.trim() || !userFormData.email.trim() || !userFormData.cnpj_cpf.trim()) {
        toast.dismiss(loadingToast);
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
  
      // Verificação de usuário existente
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${userFormData.email},cnpj_cpf.eq.${userFormData.cnpj_cpf}`)
        .maybeSingle();
  
      if (checkError) throw checkError;
  
      if (existingUser && (!selectedUser || existingUser.id !== selectedUser.id)) {
        toast.dismiss(loadingToast);
        toast.error('Já existe um usuário com este email ou CPF/CNPJ');
        return;
      }
  
      let userId = selectedUser?.id;
  
      if (!selectedUser) {
        if (!userFormData.password) {
          toast.dismiss(loadingToast);
          toast.error('Senha é obrigatória para novos usuários');
          return;
        }
  
        console.log('Payload enviado para create-user:', {
          name: userFormData.name,
          email: userFormData.email,
          password: userFormData.password,
          role: userFormData.role,
          cnpj_cpf: userFormData.cnpj_cpf,
          seller_id: userFormData.seller_id || null
        });
  
        // Chamada para a função Edge
        const { data, error: createError } = await supabase.functions.invoke('create-user', {
          body: {
            name: userFormData.name,
            email: userFormData.email,
            password: userFormData.password,
            role: userFormData.role,
            cnpj_cpf: userFormData.cnpj_cpf,
            seller_id: userFormData.seller_id || null
          }
        });
  
        if (createError) {
          console.error('Detalhes do erro:', createError);
          throw new Error(createError.message || 'Erro ao criar usuário');
        }
  
        if (!data) {
          throw new Error('Nenhum dado retornado ao criar usuário');
        }
  
        if (data.error) {
          throw new Error(data.error.message || 'Erro na função edge');
        }
  
        userId = data.user?.id;
      } else {
        // Atualização de usuário existente
        const userData = {
          id: userId,
          name: userFormData.name,
          email: userFormData.email,
          role: userFormData.role,
          cnpj_cpf: userFormData.cnpj_cpf,
          seller_id: userFormData.seller_id || null,
          status: true,
        };
  
        const { error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', userId);
  
        if (error) throw error;
      }
  
      toast.dismiss(loadingToast);
      toast.success(
        selectedUser 
          ? 'Usuário atualizado com sucesso!' 
          : 'Usuário cadastrado com sucesso!'
      );
      
      setIsUserModalOpen(false);
      setSelectedUser(null);
      resetUserForm();
      fetchUsers();
    } catch (error: any) {
      if (loadingToast) toast.dismiss(loadingToast);
      console.error('Erro completo:', error);
      toast.error(error.message || 'Erro ao salvar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      cnpj_cpf: user.cnpj_cpf,
      seller_id: user.seller_id || '',
    });
    setIsUserModalOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedUser) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading('Alterando senha...');

    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('As senhas não coincidem', { id: loadingToast });
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres', { id: loadingToast });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!', { id: loadingToast });
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.message || 'Erro ao alterar senha', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: 'customer',
      cnpj_cpf: '',
      seller_id: '',
    });
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cnpj_cpf.includes(searchTerm)
  );

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

  return (
    <div>
      <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mb-6">
        Usuários
      </h2>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex-1 min-w-0 mb-4 sm:mb-0">
              <div className="relative rounded-md shadow-sm max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Buscar usuários..."
                />
              </div>
            </div>
            <button
              onClick={() => {
                resetUserForm();
                setSelectedUser(null);
                setIsUserModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Novo Usuário
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Função
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPF/CNPJ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role]}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.cnpj_cpf}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {(user.role !== 'master' || currentUser?.role === 'master') && (
                          <>
                            <button
                              onClick={() => handleChangePassword(user)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                              title="Alterar Senha"
                            >
                              <Lock className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                              title="Editar Usuário"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Users className="h-12 w-12 mb-3" />
              <span className="text-lg">Nenhum usuário encontrado</span>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-2">
                  Tente buscar com outros termos
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Usuário */}
      <AnimatePresence>
        {isUserModalOpen && (
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
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nome
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.name}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={userFormData.email}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, email: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  {!selectedUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Senha
                      </label>
                      <input
                        type="password"
                        required={!selectedUser}
                        value={userFormData.password}
                        onChange={(e) =>
                          setUserFormData({ ...userFormData, password: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      CPF/CNPJ
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.cnpj_cpf}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, cnpj_cpf: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Função
                    </label>
                    <select
                      value={userFormData.role}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          role: e.target.value as UserRole,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {currentUser?.role === 'master' && (
                        <>
                          <option value="master">Master</option>
                          <option value="admin">Administrador</option>
                        </>
                      )}
                      <option value="seller">Vendedor</option>
                      <option value="customer">Cliente</option>
                    </select>
                  </div>

                  {userFormData.role === 'customer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Vendedor Responsável
                      </label>
                      <select
                        value={userFormData.seller_id}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            seller_id: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Selecione um vendedor</option>
                        {users
                          .filter((u) => u.role === 'seller')
                          .map((seller) => (
                            <option key={seller.id} value={seller.id}>
                              {seller.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Salvando...'
                      : selectedUser
                      ? 'Atualizar'
                      : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Senha */}
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
                  Alterar Senha - {selectedUser?.name}
                </h3>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nova Senha
                  </label>
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar Nova Senha
                  </label>
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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