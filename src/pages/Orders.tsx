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
import autoTable from 'jspdf-autotable';

interface CompanyInfo {
  name: string;
  cnpj: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    cnpj: '',
    address: null,
    phone: null,
    email: null,
    website: null,
    logo_url: null
  });

  useEffect(() => {
    fetchOrders();
    fetchCompanyInfo();
  }, [user]);

  async function fetchCompanyInfo() {
    try {
      const { data, error } = await supabase
        .from('custom')
        .select('name, cnpj, address, phone, email, website, logo_url')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) throw error;
      if (data) setCompanyInfo(data);
    } catch (error) {
      console.error('Erro ao buscar informações da empresa:', error);
      toast.error('Erro ao carregar informações da empresa');
    }
  }

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
      if (!orders || orders.length === 0) {
        toast.error('Nenhum pedido para exportar');
        return;
      }

      const exportData = orders.map(order => ({
        'Número do Pedido': order.order_number,
        'Cliente': order.users?.name || 'N/A',
        'Email': order.users?.email || 'N/A',
        'Vendedor': order.seller?.name || 'N/A',
        'Status': getStatusLabel(order.status).label,
        'Total': formatCurrency(order.total),
        'Data': new Date(order.created_at).toLocaleDateString(),
        'Concluído em': order.completed_at ? new Date(order.completed_at).toLocaleDateString() : 'N/A',
        'Observações': order.notes || 'N/A'
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
      if (!order) {
        toast.error('Pedido não encontrado');
        return;
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configurações do PDF
      doc.setFont('helvetica');
      doc.setTextColor(40);

      // Margens e largura útil
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth() - 2 * margin;

      // Cabeçalho com informações da empresa - Centralizado e formatado
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Veipeças Catálogo', pageWidth / 2 + margin, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Informações da empresa em linhas separadas e alinhadas
      const companyInfoY = 27;
      doc.text('583 - Campo Grande/MS - CEP 79100-380', pageWidth / 2 + margin, companyInfoY, { align: 'center' });
      doc.text('Telefone: (67) 3368-6500', pageWidth / 2 + margin, companyInfoY + 6, { align: 'center' });
      doc.text('veicas.comercial02@terra.com.br', pageWidth / 2 + margin, companyInfoY + 12, { align: 'center' });
      doc.text('CNPJ: 36.777.076/0001-75', pageWidth / 2 + margin, companyInfoY + 18, { align: 'center' });

      // Linha divisória
      doc.setDrawColor(200);
      doc.line(margin, companyInfoY + 25, doc.internal.pageSize.getWidth() - margin, companyInfoY + 25);

      // Informações do pedido - Alinhado à esquerda
      const orderInfoY = companyInfoY + 35;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Pedido #${order.order_number}`, margin, orderInfoY);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data: ${new Date(order.created_at).toLocaleDateString()}`, margin, orderInfoY + 10);
      doc.text(`Cliente: ${order.users?.name || 'N/A'}`, margin, orderInfoY + 20);
      doc.text(`Status: ${getStatusLabel(order.status).label}`, margin, orderInfoY + 30);

      // Itens do pedido
      const itemsStartY = orderInfoY + 40;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Itens do Pedido', margin, itemsStartY);

      // Preparar dados para a tabela
      const itemsData = order.items.map((item, index) => [
        index + 1,
        item.code || 'SEM CÓDIGO',
        item.description || item.name || 'N/A',
        item.quantity,
        formatCurrency(item.price),
        formatCurrency(item.price * item.quantity)
      ]);

      autoTable(doc, {
        startY: itemsStartY + 10,
        head: [['#', 'Código', 'Descrição', 'Qtd', 'Preço Unit.', 'Total']],
        body: itemsData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
        headStyles: { 
          fillColor: [241, 241, 241], 
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 'auto', cellPadding: { top: 2, right: 2, bottom: 2, left: 2 } },
          3: { cellWidth: 15 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        },
        didDrawPage: (data) => {
          // Adicionar rodapé em cada página
          doc.setFontSize(10);
          doc.setTextColor(150);
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.text('Obrigado por sua compra!', doc.internal.pageSize.getWidth() / 2, pageHeight - 15, { align: 'center' });
          doc.text('Veipeças Catálogo', doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
        }
      });

      // Total do pedido
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const finalY = (doc as any).lastAutoTable.finalY || itemsStartY;
      doc.text(`Total do Pedido: ${formatCurrency(order.total)}`, margin, finalY + 20);

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
    order.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalhes do Pedido #{selectedOrder.order_number}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Informações do Cliente</h4>
                  <p className="text-sm text-gray-600">{selectedOrder.users?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.users?.email || 'N/A'}</p>
                </div>
                
                {selectedOrder.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900">Observações</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedOrder.notes}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900">Itens do Pedido</h4>
                  <div className="mt-2 border-t border-gray-200">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="py-3 flex justify-between border-b border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.code || 'SEM CÓDIGO'} - {item.description || item.name || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            {item.quantity} × {formatCurrency(item.price)}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <p className="text-base font-medium text-gray-900">Total</p>
                    <p className="text-base font-medium text-gray-900">
                      {formatCurrency(selectedOrder.total)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Pedidos
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={handleExportExcel}
            disabled={orders.length === 0}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${orders.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500'}`}
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
                          {order.users?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.users?.email || 'N/A'}
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
                          onClick={() => setSelectedOrder(order)}
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