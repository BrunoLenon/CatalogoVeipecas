import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, ClipboardList, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  cartItems: number;
  recentOrders: any[];
  salesData: {
    total: number;
    change: number;
  };
}

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    cartItems: 0,
    recentOrders: [],
    salesData: {
      total: 0,
      change: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  async function fetchDashboardStats() {
    try {
      setLoading(true);

      // Buscar total de produtos
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Buscar total de pedidos
      let ordersQuery = supabase
        .from('orders')
        .select('*', { count: 'exact' });

      if (user?.role === 'customer') {
        ordersQuery = ordersQuery.eq('user_id', user.id);
      } else if (user?.role === 'seller') {
        ordersQuery = ordersQuery.eq('seller_id', user.id);
      }

      const { count: ordersCount } = await ordersQuery;

      // Buscar total de clientes (apenas para admin e master)
      let customersCount = 0;
      if (user?.role === 'master' || user?.role === 'admin') {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer');
        customersCount = count || 0;
      }

      // Buscar itens no carrinho usando a função RPC
      const { data: cartId } = await supabase
        .rpc('get_or_create_cart', { p_user_id: user?.id });

      const { data: cartData } = await supabase
        .from('cart')
        .select('items')
        .eq('id', cartId)
        .single();

      // Buscar pedidos recentes
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          *,
          users:user_id (name),
          seller:seller_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Calcular dados de vendas
      const today = new Date();
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

      const { data: currentMonthSales } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'completed');

      const { data: previousMonthSales } = await supabase
        .from('orders')
        .select('total')
        .gte('created_at', new Date(thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)).toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'completed');

      const currentTotal = currentMonthSales?.reduce((sum, order) => sum + order.total, 0) || 0;
      const previousTotal = previousMonthSales?.reduce((sum, order) => sum + order.total, 0) || 0;
      const change = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

      setStats({
        totalProducts: productsCount || 0,
        totalOrders: ordersCount || 0,
        totalCustomers: customersCount,
        cartItems: cartData?.items?.length || 0,
        recentOrders: recentOrders || [],
        salesData: {
          total: currentTotal,
          change
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    {
      title: 'Produtos',
      icon: Package,
      value: stats.totalProducts,
      link: '/produtos',
      color: 'bg-blue-500',
    },
    
    {
      title: 'Pedidos',
      icon: ClipboardList,
      value: stats.totalOrders,
      link: '/pedidos',
      color: 'bg-green-500',
    },
    {
      title: 'Carrinho',
      icon: ShoppingCart,
      value: stats.cartItems,
      link: '/carrinho',
      color: 'bg-purple-500',
    },
    {
      title: 'Clientes',
      icon: Users,
      value: stats.totalCustomers,
      link: '/configuracoes',
      color: 'bg-red-500',
      roles: ['master', 'admin'],
    },
  ];

  const filteredCards = cards.filter(
    card => !card.roles || (user?.role && card.roles.includes(user.role))
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="max-w-7xl mx-auto flex-1">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900 mb-8"
        >
          Bem-vindo, {user?.name}!
        </motion.h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {filteredCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={card.link}
                  className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-full ${card.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-2xl font-semibold text-gray-700">
                        {card.value}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Total {card.title.toLowerCase()}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {(user?.role === 'master' || user?.role === 'admin' || user?.role === 'seller') && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Vendas nos Últimos 30 Dias
                </h2>
                <div className={`flex items-center ${stats.salesData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.salesData.change >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 mr-1" />
                  )}
                  <span className="font-medium">
                    {Math.abs(stats.salesData.change).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-baseline">
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.salesData.total)}
                </p>
                <p className="ml-2 text-sm text-gray-500">
                  nos últimos 30 dias
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Pedidos Recentes
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <div key={order.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Pedido #{order.order_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        Cliente: {order.users?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-500">
                <ClipboardList className="h-12 w-12 mr-3" />
                <span className="text-lg">Nenhum pedido recente</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}