export interface Product {
  id: string;
  name: string;
  description: string;
  code: string;
  barcode: string;
  brand: string;
  stock: number;
  price: number | null;
  category_id: string;
  tags: string[];
  is_new: boolean;
  image_url?: string;
  created_at: Date;
}