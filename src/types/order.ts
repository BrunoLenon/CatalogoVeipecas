export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  seller_id?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: Date;
  completed_at?: Date;
}