import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { generateOrderPDF } from '../lib/pdf';
import { ClipboardList, Search, Package, Truck, CheckCircle, XCircle, FileDown, ChevronDown, ChevronRight, Download, ShoppingBag, DivideIcon as LucideIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order } from '../types/order';
import * as XLSX from 'xlsx';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  async function fetchOrders() {
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select(`
          *,
          users:user_id (name, email),
          seller:seller_id (name)
        `);

      // Filtrar pedidos baseado no papel do usuário
      if (user?.role === 'customer') {
        query = query.eq('user_id', user.id);
      } else if (user?.role === 'seller') {
        query = query.eq('seller_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }

  const handleExportExcel = () => {
    try {
      const exportData = orders.map(order => ({
        'Número do Pedido': order.order_number,
        'Cliente': order.users?.name,
        'Email': order.users?.email,
        'Vendedor': order.seller?.name || 'N/A',
        'Status': getStatusLabel(order.status).label,
        'Total': formatCurrency(order.total),
        'Data': new Date(order.created_at).toLocaleDateString(),
        'Concluído em': order.completed_at ? new Date(order.completed_at).toLocaleDateString() : 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      XLSX.writeFile(wb, 'pedidos.xlsx');

      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  const handleExportPDF = async (order: Order) => {
    try {
      await generateOrderPDF(order);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      processing: { label: 'Em Processamento', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const getStatusIcon = (status: string): LucideIcon => {
    const icons = {
      pending: ClipboardList,
      processing: Truck,
      completed: CheckCircle,
      cancelled: XCircle
    };
    return icons[status as keyof typeof icons] || Package;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.users?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.users?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Pedidos
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FileDown className="h-5 w-5 mr-2" />
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Buscar pedidos..."
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const status = getStatusLabel(order.status);
              const StatusIcon = getStatusIcon(order.status);
              const isExpanded = expandedOrder === order.id;
              
              return (
                <div key={order.id} className="group">
                  {/* Cabeçalho do Pedido */}
                  <div
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900 mr-2">
                              #{order.order_number}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className="h-4 w-4 mr-1" />
                              {status.label}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            {order.users?.name} • {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.total)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportPDF(order);
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          title="Baixar PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes do Pedido */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-gray-50 border-t border-gray-200"
                      >
                        <div className="p-4">
                          {/* Informações do Cliente */}
                          <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Informações do Cliente
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Nome</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {order.users?.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {order.users?.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Itens do Pedido */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Itens do Pedido
                            </h4>
                            <div className="space-y-2">
                              {order.items.map((item: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                                >
                                  <div className="flex items-center">
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="h-12 w-12 rounded object-cover"
                                      />
                                    ) : (
                                      <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="ml-4">
                                      <div className="text-sm font-medium text-gray-900">
                                        {item.name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Quantidade: {item.quantity}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                      {formatCurrency(item.price * item.quantity)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {formatCurrency(item.price)} cada
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Total e Ações */}
                          <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              Total de {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                            </div>
                            <div className="text-lg font-medium text-gray-900">
                              {formatCurrency(order.total)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <ClipboardList className="h-12 w-12 mb-3" />
              <span className="text-lg">Nenhum pedido encontrado</span>
              {searchTerm ? (
                <p className="text-sm text-gray-400 mt-2">
                  Tente buscar com outros termos
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-2">
                  Seus pedidos aparecerão aqui
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
