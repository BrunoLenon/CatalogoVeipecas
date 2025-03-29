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
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string;
  name: string;
  description?: string;
  code?: string;
  price: number;
  quantity: number;
  image_url?: string;
  stock: number;
}

interface CartData {
  id: string;
  items: CartItem[];
  total: number;
  notes?: string;
}

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user]);

  async function fetchCart() {
    try {
      setLoading(true);

      const { data: cartId } = await supabase.rpc('get_or_create_cart', { p_user_id: user?.id });
      if (!cartId) throw new Error('Erro ao criar carrinho');

      const { data, error } = await supabase
        .from('cart')
        .select('*')
        .eq('id', cartId)
        .single();

      if (error) throw error;

      const productIds = data.items.map((item: CartItem) => item.id);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, code, description, stock')
        .in('id', productIds);

      if (productsError) throw productsError;

      const enrichedItems = data.items.map((item: CartItem) => {
        const productDetails = productsData.find(p => p.id === item.id);
        return {
          ...item,
          code: productDetails?.code || item.code,
          description: productDetails?.description || item.description,
          stock: productDetails?.stock || item.stock
        };
      });

      setCart({ ...data, items: enrichedItems });
      setNotes(data.notes || '');
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

      setCart(prev => prev ? { ...prev, items: updatedItems, total: newTotal } : null);
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

      setCart(prev => prev ? { ...prev, items: updatedItems, total: newTotal } : null);
      toast.success('Item removido do carrinho');
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover item do carrinho');
    }
  };

  const saveNotes = async () => {
    if (!cart) return;

    try {
      const { error } = await supabase
        .from('cart')
        .update({
          notes: notes,
          updated_at: new Date().toISOString() // Adicionei updated_at que estava faltando
        })
        .eq('id', cart.id);

      if (error) throw error;
      toast.success('Observações salvas');
    } catch (error) {
      console.error('Erro ao salvar observações:', error);
      toast.error('Erro ao salvar observações');
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
          status: 'pending',
          notes: notes
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Atualiza apenas os itens que não excedem o estoque
      for (const item of cart.items) {
        if (item.quantity <= item.stock) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ stock: item.stock - item.quantity })
            .eq('id', item.id);

          if (stockError) throw stockError;
        }
      }

      // Marca o carrinho como finalizado
      const { error: cartError } = await supabase
        .from('cart')
        .update({ is_finalized: true })
        .eq('id', cart.id);

      if (cartError) throw cartError;

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
                    className="flex items-start py-4 space-x-4"
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
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                        Código: {item.code || item.id}
                      </p>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description || 'Sem descrição disponível'}
                      </p>
                      <p className="mt-2 text-sm font-medium text-indigo-600">
                        {formatCurrency(item.price)}
                      </p>
                      {item.quantity > item.stock && (
                        <div className="mt-2 flex items-center text-yellow-600 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          <span>Quantidade para orçamento (estoque: {item.stock})</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between space-y-2">
                      <div className="flex items-center border rounded-md">
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="p-2 text-gray-600 hover:text-gray-900"
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="p-6 bg-gray-50">
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Alguma observação sobre o pedido?"
                />
              </div>

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