import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Grid,
  List,
  AlertTriangle,
  Tag,
  Barcode,
  FileSpreadsheet,
  Upload,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShoppingCart,
  Minus,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CanAccess from '../components/CanAccess';
import ImageUploader from '../components/ImageUploader';
import type { Product } from '../types/product';
import type { Category } from '../types/category';
import * as XLSX from 'xlsx';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState({ current: 0, total: 0 });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [cartQuantity, setCartQuantity] = useState(1);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [errorPreviewData, setErrorPreviewData] = useState<{ item: any; error: string }[]>([]);
  const [isErrorPreviewOpen, setIsErrorPreviewOpen] = useState(false);
  // Novos estados para vincular fotos
  const [isBulkImageModalOpen, setIsBulkImageModalOpen] = useState(false);
  const [bulkImageUrl, setBulkImageUrl] = useState('');
  const [selectedBulkProducts, setSelectedBulkProducts] = useState<Set<string>>(new Set());
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    barcode: '',
    brand: '',
    stock: 0,
    price: 0,
    category_id: '',
    tags: [] as string[],
    is_new: true,
    image_url: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
      return products.filter((product) => {
        const searchableText = [
          product.name,
          product.code,
          product.brand,
          product.barcode,
          product.description,
          categories.find((c) => c.id === product.category_id)?.name
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchTerms.every((term) => searchableText.includes(term));
      });
    },
    [products, categories]
  );

  const filteredProducts = useMemo(
    () => debouncedSearch(searchTerm),
    [searchTerm, debouncedSearch]
  );

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast.error('Erro ao carregar categorias');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (!formData.name.trim() || !formData.code.trim() || !formData.brand.trim()) {
        toast.error('Preencha os campos obrigatórios (nome, código e marca)');
        return;
      }

      const barcodeValue = formData.barcode.trim() === '' || formData.barcode === '0' ? null : formData.barcode;

      const productData = {
        ...formData,
        barcode: barcodeValue,
        price: Number(formData.price),
        stock: Number(formData.stock)
      };

      let error;
      if (selectedProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', selectedProduct.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert([productData]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(selectedProduct ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
      setIsModalOpen(false);
      setSelectedProduct(null);
      setFormData({
        name: '',
        description: '',
        code: '',
        barcode: '',
        brand: '',
        stock: 0,
        price: 0,
        category_id: '',
        tags: [],
        is_new: true,
        image_url: ''
      });
      fetchProducts();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error.message || 'Erro ao salvar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      code: product.code,
      barcode: product.barcode || '',
      brand: product.brand,
      stock: product.stock,
      price: product.price || 0,
      category_id: product.category_id || '',
      tags: product.tags || [],
      is_new: product.is_new,
      image_url: product.image_url || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto ${product.name}?`)) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      if (error) throw error;
      toast.success('Produto excluído com sucesso!');
      fetchProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const handleImageClick = (product: Product, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (product.image_url) {
      setPreviewImage(product.image_url);
      setPreviewProduct(product);
      setIsZoomed(false);
    }
  };

  const handleZoomToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsZoomed(!isZoomed);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setPreviewImage(null);
      setPreviewProduct(null);
      setIsZoomed(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!user) return;

    try {
      setAddingToCart(product.id);
      const { data: cartId } = await supabase.rpc('get_or_create_cart', { p_user_id: user.id });
      if (!cartId) throw new Error('Erro ao acessar carrinho');

      const { data: cart } = await supabase.from('cart').select('items').eq('id', cartId).single();
      if (!cart) throw new Error('Carrinho não encontrado');

      const items = cart.items || [];
      const existingItem = items.find((item: any) => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += cartQuantity;
      } else {
        items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: cartQuantity,
          image_url: product.image_url,
          stock: product.stock
        });
      }

      const { error: updateError } = await supabase
        .from('cart')
        .update({ items, saved_at: new Date().toISOString() })
        .eq('id', cartId);

      if (updateError) throw updateError;

      toast.success('Produto adicionado ao carrinho!');
      setCartQuantity(1);
    } catch (error: any) {
      console.error('Erro ao adicionar ao carrinho:', error);
      toast.error('Erro ao adicionar ao carrinho');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleQuantityChange = (value: number) => {
    if (value >= 1) setCartQuantity(value);
  };

  const downloadTemplate = () => {
    const template = [
      {
        nome: 'Exemplo Produto',
        descricao: 'Descrição do produto',
        codigo: 'PROD001',
        codigo_barras: '789123456789',
        marca: 'Marca Exemplo',
        estoque: 10,
        preco: 99.90,
        categoria: 'ID da categoria (opcional)',
        novo: true
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
  };

  const handleImportExcel = async (file: File) => {
    setIsImporting(true);
    setImportErrors([]);
    setIsLoadingPreview(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data) throw new Error('Erro ao ler o arquivo');

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        setPreviewData(jsonData);
        setSelectedItems(new Set(jsonData.map((_, index) => index)));
        setIsPreviewModalOpen(true);
        setIsImportModalOpen(false);
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast.error('Erro ao processar arquivo');
        setIsImportModalOpen(false);
      } finally {
        setIsImporting(false);
        setIsLoadingPreview(false);
      }
    };

    reader.onerror = () => {
      console.error('Erro ao ler o arquivo');
      toast.error('Erro ao ler o arquivo');
      setIsImporting(false);
      setIsImportModalOpen(false);
      setIsLoadingPreview(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    setIsPreviewModalOpen(false);
    setIsImporting(true);
    setImportProgress(0);
    setImportStatus({ current: 0, total: 0 });
    setImportErrors([]);
    setErrorPreviewData([]);
    setIsImportModalOpen(true);

    try {
      const itemsToImport = previewData.filter((_, index) => selectedItems.has(index));
      setImportStatus({ current: 0, total: itemsToImport.length });
      let created = 0;
      let updated = 0;
      const errors: { item: any; error: string }[] = [];

      for (let i = 0; i < itemsToImport.length; i++) {
        const row = itemsToImport[i];
        setImportStatus((prev) => ({ ...prev, current: i + 1 }));
        setImportProgress(Math.round(((i + 1) / itemsToImport.length) * 100));

        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
          if (!row.nome || !row.codigo || !row.marca) {
            errors.push({
              item: row,
              error: `Campos obrigatórios (nome, código, marca) faltando na linha ${i + 2}`
            });
            continue;
          }

          const barcodeValue =
            !row.codigo_barras || row.codigo_barras === '0' || row.codigo_barras.trim() === ''
              ? null
              : row.codigo_barras;

          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('code', row.codigo)
            .eq('brand', row.marca)
            .maybeSingle();

          if (existingProduct) {
            const { error: updateError } = await supabase
              .from('products')
              .update({
                name: row.nome,
                description: row.descricao || '',
                barcode: barcodeValue,
                stock: Number(row.estoque) || 0,
                price: Number(row.preco) || 0,
                category_id: row.categoria || '',
                is_new: row.novo === true
              })
              .eq('id', existingProduct.id);

            if (updateError) {
              errors.push({ item: row, error: `Erro ao atualizar: ${updateError.message}` });
            } else {
              updated++;
            }
          } else {
            const { error: insertError } = await supabase.from('products').insert([
              {
                name: row.nome,
                description: row.descricao || '',
                code: row.codigo,
                barcode: barcodeValue,
                brand: row.marca,
                stock: Number(row.estoque) || 0,
                price: Number(row.preco) || 0,
                category_id: row.categoria || '',
                is_new: row.novo === true
              }
            ]);

            if (insertError) {
              errors.push({ item: row, error: `Erro ao criar: ${insertError.message}` });
            } else {
              created++;
            }
          }
        } catch (error: any) {
          errors.push({ item: row, error: `Linha ${i + 2}: ${error.message}` });
        }
      }

      if (created > 0 || updated > 0) {
        toast.success(`${created} criados, ${updated} atualizados`);
        fetchProducts();
      }

      if (errors.length > 0) {
        setErrorPreviewData(errors);
        setIsErrorPreviewOpen(true);
        setImportErrors(errors.map((e) => e.error).slice(0, 5));
        toast.error(`${errors.length} erro(s) durante a importação`);
        console.error('Erros de importação:', errors);
      } else {
        setIsImportModalOpen(false);
      }
    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      toast.error('Erro ao importar produtos');
      setIsImportModalOpen(false);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === previewData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(previewData.map((_, index) => index)));
    }
  };

  const handleExportExcel = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;

      const worksheet = XLSX.utils.json_to_sheet(data || []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
      XLSX.writeFile(workbook, 'produtos.xlsx');
    } catch (error) {
      console.error('Erro ao exportar produtos:', error);
      toast.error('Erro ao exportar produtos');
    }
  };

  // Nova função para vincular imagem a múltiplos produtos
  const handleBulkImageUpdate = async () => {
    if (!bulkImageUrl.trim()) {
      toast.error('Por favor, forneça uma URL de imagem válida');
      return;
    }
    if (selectedBulkProducts.size === 0) {
      toast.error('Selecione pelo menos um produto');
      return;
    }

    try {
      setIsSubmitting(true);
      const productIds = Array.from(selectedBulkProducts);
      const { error } = await supabase
        .from('products')
        .update({ image_url: bulkImageUrl })
        .in('id', productIds);

      if (error) throw error;

      toast.success(`Imagem vinculada a ${selectedBulkProducts.size} produto(s) com sucesso!`);
      setIsBulkImageModalOpen(false);
      setBulkImageUrl('');
      setSelectedBulkProducts(new Set());
      setBulkSearchTerm('');
      fetchProducts();
    } catch (error) {
      console.error('Erro ao vincular imagem:', error);
      toast.error('Erro ao vincular imagem aos produtos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBulkProducts = useMemo(() => {
    const searchTerms = bulkSearchTerm.toLowerCase().split(' ').filter(Boolean);
    return products.filter((product) => {
      const searchableText = [
        product.name,
        product.code,
        product.brand,
        product.barcode,
        product.description,
        categories.find((c) => c.id === product.category_id)?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [bulkSearchTerm, products, categories]);

  const toggleBulkProduct = (productId: string) => {
    const newSelected = new Set(selectedBulkProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedBulkProducts(newSelected);
  };

  const toggleSelectAllBulk = () => {
    if (selectedBulkProducts.size === filteredBulkProducts.length) {
      setSelectedBulkProducts(new Set());
    } else {
      setSelectedBulkProducts(new Set(filteredBulkProducts.map((p) => p.id)));
    }
  };

  const formatCurrency = (value: number | null) =>
    value === null
      ? 'R$ 0,00'
      : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const FuturisticProgressIndicator = ({
    progress,
    current,
    total,
    label
  }: {
    progress: number;
    current: number;
    total: number;
    label: string;
  }) => {
    const circumference = 2 * Math.PI * 90;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center">
        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="12"
            className="opacity-20"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="url(#neonGradient)"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ffcc" stopOpacity="1" />
              <stop offset="50%" stopColor="#00ccff" stopOpacity="1" />
              <stop offset="100%" stopColor="#9933ff" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,204,255,0.8)]">
            {progress}%
          </span>
          <span className="text-sm text-gray-300 mt-2 animate-pulse">{label}</span>
          <span className="text-sm text-gray-200 mt-1">
            Processando produto {current} de {total}
          </span>
        </div>
        <div className="absolute w-64 h-64 rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-transparent blur-3xl animate-pulse" />
      </div>
    );
  };

  const renderListView = () => (
    <div className="overflow-hidden">
      <div className="min-w-full">
        {filteredProducts.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
            onClick={() => handleImageClick(product)}
          >
            <div className="flex items-start space-x-4">
              <div className="relative group flex-shrink-0">
                {product.image_url ? (
                  <div className="relative w-16 h-16">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                      <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-gray-900 truncate">{product.name}</h3>
                <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
                  <span className="inline-flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    {product.code}
                  </span>
                  <span className="inline-flex items-center">{product.brand}</span>
                  {product.barcode && (
                    <span className="inline-flex items-center">
                      <Barcode className="h-4 w-4 mr-1" />
                      {product.barcode}
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{product.description}</p>
                )}
              </div>

              <div className="text-right">
                <div className="text-base font-medium text-gray-900">
                  {formatCurrency(product.price)}
                </div>
                <div
                  className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  Estoque: {product.stock}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {(user?.role === 'customer' || user?.role === 'seller') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    disabled={addingToCart === product.id}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200 disabled:opacity-50"
                    title="Adicionar ao carrinho"
                  >
                    <ShoppingCart
                      className={`h-5 w-5 ${addingToCart === product.id ? 'animate-pulse' : ''}`}
                    />
                  </button>
                )}
                <CanAccess roles={['master', 'admin']}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(product);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200"
                    title="Editar produto"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                    title="Excluir produto"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </CanAccess>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-6">
      {filteredProducts.map((product) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
          onClick={() => handleImageClick(product)}
        >
          <div className="relative aspect-w-4 aspect-h-3">
            {product.image_url ? (
              <div className="relative w-full h-48">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 rounded-t-lg flex items-center justify-center">
                  <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8" />
                </div>
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 truncate">{product.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{product.brand}</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">{product.code}</span>
              </div>
              {product.barcode && (
                <div className="flex items-center space-x-2">
                  <Barcode className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{product.barcode}</span>
                </div>
              )}
            </div>
            {product.description && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{product.description}</p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-medium text-gray-900">
                {formatCurrency(product.price)}
              </span>
              <span
                className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                Estoque: {product.stock}
              </span>
            </div>

            <div className="mt-4 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {(user?.role === 'customer' || user?.role === 'seller') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  disabled={addingToCart === product.id}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200 disabled:opacity-50"
                  title="Adicionar ao carrinho"
                >
                  <ShoppingCart
                    className={`h-5 w-5 ${addingToCart === product.id ? 'animate-pulse' : ''}`}
                  />
                </button>
              )}
              <CanAccess roles={['master', 'admin']}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(product);
                  }}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200"
                  title="Editar produto"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(product);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                  title="Excluir produto"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </CanAccess>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Produtos
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Total de produtos cadastrados: {loading ? 'Carregando...' : products.length}
          </p>
        </div>
        <CanAccess roles={['master', 'admin']}>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Modelo Excel
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Upload className="h-5 w-5 mr-2" />
              Importar Excel
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Download className="h-5 w-5 mr-2" />
              Exportar Excel
            </button>
            <button
              onClick={() => setIsBulkImageModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Upload className="h-5 w-5 mr-2" />
              Vincular Foto
            </button>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setFormData({
                  name: '',
                  description: '',
                  code: '',
                  barcode: '',
                  brand: '',
                  stock: 0,
                  price: 0,
                  category_id: '',
                  tags: [],
                  is_new: true,
                  image_url: ''
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Produto
            </button>
          </div>
        </CanAccess>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="relative rounded-md shadow-sm max-w-md flex-1 mr-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Buscar por nome, código, marca, descrição..."
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-500'
              }`}
              title="Visualização em grade"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${
                viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-500'
              }`}
              title="Visualização em lista"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredProducts.length > 0 ? (
            viewMode === 'list' ? renderListView() : renderGridView()
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Package className="h-12 w-12 mb-3" />
              <span className="text-lg">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </span>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm ? 'Tente buscar com outros termos' : 'Clique em "Novo Produto" para começar'}
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
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
                  {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marca</label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Código</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Código de Barras</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estoque</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Preço</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Categoria</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imagem do Produto
                    </label>
                    <div className="flex items-center space-x-6">
                      <div className="flex-shrink-0">
                        {formData.image_url ? (
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <ImageUploader onUpload={(url) => setFormData({ ...formData, image_url: url })} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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
                    {isSubmitting ? 'Salvando...' : selectedProduct ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setPreviewImage(null);
              setPreviewProduct(null);
              setIsZoomed(false);
              setCartQuantity(1);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative">
                  {previewProduct.image_url ? (
                    <div className="relative">
                      <img
                        src={previewProduct.image_url}
                        alt={previewProduct.name}
                        className={`w-full h-[400px] object-contain transition-all duration-300 ${
                          isZoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in'
                        }`}
                        onClick={handleZoomToggle}
                      />
                      <div className="absolute top-4 right-4 flex space-x-2">
                        <button
                          onClick={handleZoomToggle}
                          className="p-2 text-white hover:text-gray-300 transition-colors rounded-full bg-black bg-opacity-50 hover:bg-opacity-70"
                          title={isZoomed ? 'Reduzir' : 'Ampliar'}
                        >
                          {isZoomed ? <ZoomOut className="h-6 w-6" /> : <ZoomIn className="h-6 w-6" />}
                        </button>
                        <button
                          onClick={() => {
                            setPreviewImage(null);
                            setPreviewProduct(null);
                            setIsZoomed(false);
                            setCartQuantity(1);
                          }}
                          className="p-2 text-white hover:text-gray-300 transition-colors rounded-full bg-black bg-opacity-50 hover:bg-opacity-70"
                          title="Fechar"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center">
                      <Package className="h-20 w-20 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col h-full">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{previewProduct.name}</h2>
                  <div className="flex items-center space-x-2 text-gray-500 mb-4">
                    <Tag className="h-4 w-4" />
                    <span>{previewProduct.code}</span>
                    <span>•</span>
                    <span>{previewProduct.brand}</span>
                  </div>
                  {previewProduct.description && (
                    <p className="text-gray-600 mb-6">{previewProduct.description}</p>
                  )}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatCurrency(previewProduct.price)}
                    </span>
                    <span
                      className={`text-sm ${
                        previewProduct.stock > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      Estoque: {previewProduct.stock}
                    </span>
                  </div>

                  {(user?.role === 'customer' || user?.role === 'seller') && (
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-700">Quantidade:</span>
                        <div className="flex items-center border rounded-md">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(cartQuantity - 1)}
                            disabled={cartQuantity <= 1}
                            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={cartQuantity}
                            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                            className="w-16 text-center border-0 focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(cartQuantity + 1)}
                            className="p-2 text-gray-600 hover:text-gray-900"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleAddToCart(previewProduct);
                          setPreviewImage(null);
                          setPreviewProduct(null);
                          setIsZoomed(false);
                          setCartQuantity(1);
                        }}
                        disabled={addingToCart === previewProduct.id}
                        className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {addingToCart === previewProduct.id ? (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                            Adicionando...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            Adicionar ao Carrinho
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">Importar Produtos</h3>
              {!isImporting && !isLoadingPreview && (
                <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-cyan-500 hover:bg-gray-50 transition-all duration-200">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportExcel(file);
                    }}
                    className="hidden"
                    disabled={isImporting || isLoadingPreview}
                  />
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Clique ou arraste um arquivo Excel aqui</span>
                    <span className="block text-xs text-gray-400 mt-1">Formatos: .xlsx, .xls</span>
                  </div>
                </label>
              )}
              {(isImporting || isLoadingPreview) && (
                <div className="flex justify-center mt-6">
                  <FuturisticProgressIndicator
                    progress={isLoadingPreview ? 0 : importProgress}
                    current={isLoadingPreview ? 0 : importStatus.current}
                    total={isLoadingPreview ? 0 : importStatus.total}
                    label={isLoadingPreview ? 'Carregando Preview...' : 'Importando...'}
                  />
                </div>
              )}
              {importErrors.length > 0 && (
                <div className="mt-4 text-sm text-red-600">
                  <h4 className="font-semibold mb-1">Erros encontrados:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setIsErrorPreviewOpen(true)}
                    className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Ver detalhes dos erros
                  </button>
                </div>
              )}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                  disabled={isImporting || isLoadingPreview}
                >
                  {isImporting || isLoadingPreview ? 'Processando...' : 'Cancelar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPreviewModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Pré-visualização da Importação</h3>
                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex items-center mb-4">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600"
                  >
                    {selectedItems.size === previewData.length ? (
                      <CheckSquare className="h-5 w-5 mr-2" />
                    ) : (
                      <Square className="h-5 w-5 mr-2" />
                    )}
                    {selectedItems.size === previewData.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                  <span className="ml-4 text-sm text-gray-500">
                    {selectedItems.size} de {previewData.length} selecionados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Selecionar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marca
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código de Barras
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estoque
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleSelectItem(index)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {selectedItems.has(index) ? (
                                <CheckSquare className="h-5 w-5" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.nome || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.codigo || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.marca || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.codigo_barras || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.estoque ?? 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.preco ? formatCurrency(Number(item.preco)) : 'R$ 0,00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={selectedItems.size === 0}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Confirmar Importação
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isErrorPreviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Produtos com Erro</h3>
                  <button
                    onClick={() => setIsErrorPreviewOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marca
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código de Barras
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estoque
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Erro
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {errorPreviewData.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.item.nome || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.item.codigo || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.item.marca || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.item.codigo_barras || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.item.estoque ?? 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.item.preco ? formatCurrency(Number(entry.item.preco)) : 'R$ 0,00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {entry.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsErrorPreviewOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBulkImageModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Vincular Foto a Múltiplos Produtos</h3>
                  <button
                    onClick={() => setIsBulkImageModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL da Imagem</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={bulkImageUrl}
                      onChange={(e) => setBulkImageUrl(e.target.value)}
                      placeholder="Cole a URL da imagem aqui"
                      className="flex-1 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <ImageUploader onUpload={(url) => setBulkImageUrl(url)} />
                  </div>
                  {bulkImageUrl && (
                    <img
                      src={bulkImageUrl}
                      alt="Preview"
                      className="mt-4 h-24 w-24 object-cover rounded-lg border border-gray-200"
                      onError={() => toast.error('URL da imagem inválida')}
                    />
                  )}
                </div>

                <div className="relative rounded-md shadow-sm mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={bulkSearchTerm}
                    onChange={(e) => setBulkSearchTerm(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Filtrar produtos por nome, código, marca..."
                  />
                </div>

                <div className="flex items-center mb-4">
                  <button
                    onClick={toggleSelectAllBulk}
                    className="flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600"
                  >
                    {selectedBulkProducts.size === filteredBulkProducts.length ? (
                      <CheckSquare className="h-5 w-5 mr-2" />
                    ) : (
                      <Square className="h-5 w-5 mr-2" />
                    )}
                    {selectedBulkProducts.size === filteredBulkProducts.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                  <span className="ml-4 text-sm text-gray-500">
                    {selectedBulkProducts.size} de {filteredBulkProducts.length} selecionados
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Selecionar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marca
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBulkProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleBulkProduct(product.id)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {selectedBulkProducts.has(product.id) ? (
                                <CheckSquare className="h-5 w-5" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.brand}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsBulkImageModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBulkImageUpdate}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={isSubmitting || selectedBulkProducts.size === 0 || !bulkImageUrl}
                  >
                    {isSubmitting ? 'Vinculando...' : 'Vincular Imagem'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}