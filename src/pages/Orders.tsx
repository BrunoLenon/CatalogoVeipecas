import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  stock: number;
  code: string;        // Adicionado código do produto
  description: string; // Adicionado descrição completa
}

interface CartData {
  id: string;
  items: CartItem[];
  total: number;
}

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user]);

  async function fetchCart() {
    try {
      setLoading(true);

      const { data: cartId } = await supabase
        .rpc('get_or_create_cart', { p_user_id: user?.id });

      if (!cartId) throw new Error('Erro ao criar carrinho');

      const { data, error } = await supabase
        .from('cart')
        .select(`
          *,
          items (
            *,
            products (code, description)
          )
        `)
        .eq('id', cartId)
        .single();

      if (error) throw error;

      // Mapear os itens para incluir code e description
      const formattedItems = data.items.map((item: any) => ({
        ...item,
        code: item.products.code,
        description: item.products.description
      }));

      setCart({
        ...data,
        items: formattedItems
      });
    } catch (error) {
      console.error('Erro ao buscar carrinho:', error);
      toast.error('Erro ao carregar carrinho');
    } finally {
      setLoading(false);
    }
  }

  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (!cart) return;

    try {
      const updatedItems = cart.items.map(item => {
        if (item.id === itemId) {
          if (newQuantity > item.stock) {
            toast.error('Quantidade maior que o estoque disponível');
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      });

      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { error } = await supabase
        .from('cart')
        .update({
          items: updatedItems,
          total: newTotal,
          saved_at: new Date().toISOString()
        })
        .eq('id', cart.id);

      if (error) throw error;

      setCart(prev => prev ? {
        ...prev,
        items: updatedItems,
        total: newTotal
      } : null);

      toast.success('Carrinho atualizado');
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      toast.error('Erro ao atualizar carrinho');
    }
  };

  const removeItem = async (itemId: string) => {
    if (!cart) return;

    try {
      const updatedItems = cart.items.filter(item => item.id !== itemId);
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { error } = await supabase
        .from('cart')
        .update({
          items: updatedItems,
          total: newTotal,
          saved_at: new Date().toISOString()
        })
        .eq('id', cart.id);

      if (error) throw error;

      setCart(prev => prev ? {
        ...prev,
        items: updatedItems,
        total: newTotal
      } : null);

      toast.success('Item removido do carrinho');
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover item do carrinho');
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;

    try {
      setIsCheckingOut(true);

      const orderNumber = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user?.id,
          seller_id: user?.seller_id,
          items: cart.items,
          total: cart.total,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: cartError } = await supabase
        .from('cart')
        .update({ is_finalized: true })
        .eq('id', cart.id);

      if (cartError) throw cartError;

      for (const item of cart.items) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.stock - item.quantity })
          .eq('id', item.id);

        if (stockError) throw stockError;
      }

      toast.success('Pedido realizado com sucesso!');
      navigate('/pedidos');
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error('Erro ao finalizar pedido');
    } finally {
      setIsCheckingOut(false);
    }
  };

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
    <div>
      <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mb-6">
        Carrinho
      </h2>

      <div className="bg-white shadow rounded-lg">
        {cart && cart.items.length > 0 ? (
          <div className="divide-y divide-gray-200">
            <div className="p-6">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center py-4 space-x-4"
                  >
                    <div className="flex-shrink-0 w-16 h-16">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Código: {item.code}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.description}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {formatCurrency(item.price)} / un
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center border rounded-md">
                        <button
                          onClick={() => updateItemQuantity(item.id, Math.max(0, item.quantity - 1))}
                          className="p-2 text-gray-600 hover:text-gray-900"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-medium text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-lg font-medium text-gray-900">Total</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(cart.total)}
                </p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="mt-6 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Finalizando...
                  </div>
                ) : (
                  <>
                    Finalizar Pedido
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <ShoppingCart className="h-12 w-12 mb-3" />
            <span className="text-lg">Seu carrinho está vazio</span>
            <p className="text-sm text-gray-400 mt-2">
              Adicione produtos ao seu carrinho para continuar
            </p>
            <button
              onClick={() => navigate('/produtos')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Ver Produtos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}