import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
  Tags, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  AlertTriangle, 
  Download,
  Upload,
  Package,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CanAccess from '../components/CanAccess';
import type { Category } from '../types/category';
import type { Product } from '../types/product';
import * as XLSX from 'xlsx';

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (expandedCategory) {
      fetchProductsByCategory(expandedCategory);
    }
  }, [expandedCategory]);

  async function fetchCategories() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          products:products(count)
        `)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProductsByCategory(categoryId: string) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const trimmedName = formData.name.trim();
      
      if (!trimmedName) {
        toast.error('O nome da categoria é obrigatório');
        return;
      }

      // Verificar se já existe uma categoria com o mesmo nome
      const { data: existingCategory, error: checkError } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCategory && (!selectedCategory || existingCategory.id !== selectedCategory.id)) {
        toast.error('Já existe uma categoria com este nome');
        return;
      }

      let error;
      if (selectedCategory) {
        const { error: updateError } = await supabase
          .from('categories')
          .update({ name: trimmedName })
          .eq('id', selectedCategory.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('categories')
          .insert([{ name: trimmedName }]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        selectedCategory
          ? 'Categoria atualizada com sucesso!'
          : 'Categoria cadastrada com sucesso!'
      );
      
      setIsModalOpen(false);
      setSelectedCategory(null);
      setFormData({ name: '' });
      fetchCategories();
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      toast.error(error.message || 'Erro ao salvar categoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    try {
      // Verificar se tem produtos vinculados
      const productCount = category.products?.[0]?.count || 0;
      
      if (productCount > 0) {
        toast.error(
          `Não é possível excluir esta categoria pois ela possui ${productCount} produto${productCount > 1 ? 's' : ''} vinculado${productCount > 1 ? 's' : ''}`
        );
        return;
      }

      if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;

      toast.success('Categoria excluída com sucesso!');
      fetchCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
      setProducts([]);
    } else {
      setExpandedCategory(categoryId);
    }
  };

  const downloadTemplate = () => {
    const template = [
      { nome: 'Exemplo Categoria 1' },
      { nome: 'Exemplo Categoria 2' },
      { nome: 'Exemplo Categoria 3' }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Categorias');
    XLSX.writeFile(wb, 'modelo_importacao_categorias.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          let created = 0;
          let errors = [];

          for (const row of jsonData as any[]) {
            try {
              if (!row.nome) {
                errors.push(`Linha com nome faltando`);
                continue;
              }

              // Verificar se a categoria já existe
              const { data: existingCategory } = await supabase
                .from('categories')
                .select('id')
                .ilike('name', row.nome)
                .maybeSingle();

              if (existingCategory) {
                errors.push(`Categoria "${row.nome}" já existe`);
                continue;
              }

              // Inserir nova categoria
              const { error: insertError } = await supabase
                .from('categories')
                .insert([{ name: row.nome }]);

              if (insertError) {
                errors.push(`Erro ao criar categoria "${row.nome}": ${insertError.message}`);
              } else {
                created++;
              }
            } catch (error: any) {
              errors.push(`Erro ao processar linha: ${error.message}`);
            }
          }

          if (created > 0) {
            toast.success(`${created} ${created === 1 ? 'categoria criada' : 'categorias criadas'} com sucesso!`);
            fetchCategories();
          }

          if (errors.length > 0) {
            toast((t) => (
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-red-800">
                    Alguns itens não puderam ser processados:
                  </h4>
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {errors.slice(0, 3).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 3 && (
                      <li>...e mais {errors.length - 3} erro(s)</li>
                    )}
                  </ul>
                </div>
              </div>
            ), {
              duration: 5000,
              style: {
                maxWidth: '500px',
                padding: '16px',
              },
            });
          }
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          toast.error('Erro ao processar arquivo. Verifique o formato dos dados.');
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar categorias');
    }

    e.target.value = '';
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Categorias
          </h2>
        </div>
        <CanAccess roles={['master']}>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Modelo Excel
            </button>
            
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
              <Upload className="h-5 w-5 mr-2" />
              Importar Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                setSelectedCategory(null);
                setFormData({ name: '' });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Categoria
            </button>
          </div>
        </CanAccess>
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
              placeholder="Buscar categorias..."
            />
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredCategories.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredCategories.map((category) => (
                <div key={category.id}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className="flex items-center min-w-0">
                      {expandedCategory === category.id ? (
                        <ChevronDown className="h-5 w-5 text-gray-400 mr-3" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400 mr-3" />
                      )}
                      <Tags className="h-5 w-5 text-gray-400 flex-shrink-0 mr-3" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {category.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {category.products?.[0]?.count || 0} produto{category.products?.[0]?.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <CanAccess roles={['master']}>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(category);
                          }}
                          className="p-1 text-indigo-600 hover:text-indigo-900 transition-colors duration-150"
                          title="Editar categoria"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(category);
                          }}
                          className="p-1 text-red-600 hover:text-red-900 transition-colors duration-150"
                          title="Excluir categoria"
                          disabled={category.products?.[0]?.count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CanAccess>
                  </motion.div>

                  {/* Lista de produtos da categoria */}
                  <AnimatePresence>
                    {expandedCategory === category.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-gray-50 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Produtos nesta categoria:
                          </h4>
                          {products.length > 0 ? (
                            <div className="space-y-2">
                              {products.map((product) => (
                                <motion.div
                                  key={product.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200"
                                >
                                  <div className="flex items-center">
                                    {product.image_url ? (
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="h-10 w-10 rounded object-cover"
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                                        <Package className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="ml-3">
                                      <p className="text-sm font-medium text-gray-900">
                                        {product.name}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        {product.brand}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatCurrency(product.price)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Estoque: {product.stock}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <Package className="h-8 w-8 mx-auto mb-2" />
                              <p>Nenhum produto nesta categoria</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Tags className="h-12 w-12 mb-3" />
              <span className="text-lg">
                {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
              </span>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm ? (
                  'Tente buscar com outros termos'
                ) : (
                  'Clique em "Nova Categoria" para começar'
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
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
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
                    Nome
                  </label>
                  <input
                    id="categoryName"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Digite o nome da categoria"
                    maxLength={100}
                    autoFocus
                  />
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
                    {isSubmitting ? 'Salvando...' : selectedCategory ? 'Atualizar' : 'Cadastrar'}
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