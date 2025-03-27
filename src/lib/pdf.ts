import jsPDF from 'jspdf';
import { supabase } from './supabase';
import type { Order } from '../types/order';

interface CompanyInfo {
  name: string;
  cnpj: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export async function generateOrderPDF(order: Order): Promise<void> {
  try {
    // Buscar informações da empresa
    const { data: companyData, error: companyError } = await supabase
      .from('custom')
      .select('name, cnpj, logo_url, address, phone, email')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (companyError) throw companyError;

    const company = companyData as CompanyInfo;

    // Criar PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configurações
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let y = margin;

    // Funções auxiliares
    const addLine = () => {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const formatCurrency = (value: number) => {
      return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
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

    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(66, 66, 66);
    doc.text(company.name, margin, y);

    // Logo (se existir)
    if (company.logo_url) {
      const img = new Image();
      img.src = company.logo_url;
      await new Promise((resolve) => {
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const logoWidth = 30;
          const logoHeight = logoWidth / aspectRatio;
          doc.addImage(
            img,
            'PNG',
            pageWidth - margin - logoWidth,
            y - 10,
            logoWidth,
            logoHeight
          );
          resolve(true);
        };
      });
    }

    y += 15;

    // Informações da empresa
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`CNPJ: ${company.cnpj}`, margin, y);
    y += 5;

    if (company.address) {
      doc.text(company.address, margin, y);
      y += 5;
    }

    if (company.phone || company.email) {
      doc.text(
        [company.phone, company.email].filter(Boolean).join(' • '),
        margin,
        y
      );
      y += 5;
    }

    y += 10;
    addLine();

    // Informações do pedido
    doc.setFontSize(14);
    doc.setTextColor(66, 66, 66);
    doc.text(`Pedido #${order.order_number}`, margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${formatDate(order.created_at)}`, margin, y);
    y += 5;

    doc.text(`Status: ${getStatusLabel(order.status)}`, margin, y);
    y += 10;

    // Informações do cliente
    doc.setFontSize(12);
    doc.setTextColor(66, 66, 66);
    doc.text('Dados do Cliente', margin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Nome: ${order.users?.name}`, margin, y);
    y += 5;
    doc.text(`Email: ${order.users?.email}`, margin, y);
    y += 5;
    doc.text(`CPF/CNPJ: ${order.users?.cnpj_cpf}`, margin, y);
    y += 10;

    addLine();

    // Definir colunas com espaçamento ajustado
    const columns = {
      code: { x: margin, width: 20 }, // Código
      description: { x: margin + 25, width: 70 }, // Descrição
      quantity: { x: margin + 100, width: 15 }, // Quantidade
      price: { x: margin + 120, width: 25 }, // Preço
      total: { x: margin + 150, width: 25 } // Total
    };

    // Cabeçalho dos itens
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Código', columns.code.x, y);
    doc.text('Descrição', columns.description.x, y);
    doc.text('Qtd', columns.quantity.x, y);
    doc.text('Preço', columns.price.x, y);
    doc.text('Total', columns.total.x, y);
    y += 5;

    addLine();

    // Itens do pedido
    doc.setFontSize(10);
    doc.setTextColor(66, 66, 66);

    order.items.forEach((item: any) => {
      // Verificar se precisa de nova página
      if (y > 250) {
        doc.addPage();
        y = margin;
        
        // Repetir cabeçalho na nova página
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Código', columns.code.x, y);
        doc.text('Descrição', columns.description.x, y);
        doc.text('Qtd', columns.quantity.x, y);
        doc.text('Preço', columns.price.x, y);
        doc.text('Total', columns.total.x, y);
        y += 5;
        addLine();
      }

      const itemTotal = item.price * item.quantity;

      // Código do produto (limitado a 6 caracteres)
      const code = item.code || '';
      doc.text(
        code.substring(0, 6),
        columns.code.x,
        y
      );

      // Descrição do produto (com quebra de linha se necessário)
      const description = doc.splitTextToSize(
        item.name,
        columns.description.width
      );
      doc.text(description, columns.description.x, y);

      // Quantidade (alinhado à direita)
      doc.text(
        item.quantity.toString(),
        columns.quantity.x + 10, // Ajuste para alinhar à direita
        y,
        { align: 'right' }
      );

      // Preço unitário (alinhado à direita)
      doc.text(
        formatCurrency(item.price),
        columns.price.x + 20, // Ajuste para alinhar à direita
        y,
        { align: 'right' }
      );

      // Total do item (alinhado à direita)
      doc.text(
        formatCurrency(itemTotal),
        columns.total.x + 20, // Ajuste para alinhar à direita
        y,
        { align: 'right' }
      );

      // Incrementar y baseado no número de linhas da descrição
      y += Math.max(description.length * 5, 7);
    });

    y += 5;
    addLine();

    // Total geral (alinhado à direita)
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(
      'Total',
      columns.price.x,
      y
    );
    doc.text(
      formatCurrency(order.total),
      columns.total.x + 20, // Ajuste para alinhar à direita
      y,
      { align: 'right' }
    );

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Salvar PDF
    doc.save(`pedido-${order.order_number}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Erro ao gerar PDF do pedido');
  }
}

function getStatusLabel(status: string): string {
  const labels = {
    pending: 'Pendente',
    processing: 'Em Processamento',
    completed: 'Concluído',
    cancelled: 'Cancelado'
  };
  return labels[status as keyof typeof labels] || status;
}