import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
  ClipboardList, 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  FileDown,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import type { Order } from '../types/order';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
          customer:user_id (name, email),
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
        'Cliente': order.customer?.name,
        'Email': order.customer?.email,
        'Vendedor': order.seller?.name || 'N/A',
        'Status': getStatusLabel(order.status),
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

  const handleExportPDF = (order: Order) => {
    try {
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(20);
      doc.text('Pedido #' + order.order_number, 20, 20);
      
      doc.setFontSize(12);
      doc.text('Data: ' + new Date(order.created_at).toLocaleDateString(), 20, 30);
      doc.text('Cliente: ' + order.customer?.name, 20, 40);
      doc.text('Status: ' + getStatusLabel(order.status), 20, 50);
      
      // Itens
      doc.setFontSize(14);
      doc.text('Itens do Pedido', 20, 70);
      
      let y = 80;
      order.items.forEach((item, index) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.text(`${index + 1}. ${item.name}`, 20, y);
        doc.text(`Qtd: ${item.quantity}`, 120, y);
        doc.text(`R$ ${item.price.toFixed(2)}`, 160, y);
        y += 10;
      });
      
      // Total
      doc.setFontSize(14);
      doc.text(`Total: ${formatCurrency(order.total)}`, 20, y + 20);
      
      doc.save(`pedido-${order.order_number}.pdf`);
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

  const getStatusIcon = (status: string) => {
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
    order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  {(user?.role === 'master' || user?.role === 'admin') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const StatusIcon = getStatusIcon(order.status);
                  const status = getStatusLabel(order.status);
                  
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{order.order_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.customer?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customer?.email}
                        </div>
                      </td>
                      {(user?.role === 'master' || user?.role === 'admin') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.seller?.name || 'N/A'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleExportPDF(order)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="Gerar PDF"
                        >
                          <FileDown className="h-5 w-5" />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="Visualizar Detalhes"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
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
