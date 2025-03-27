export interface Category {
  id: string;
  name: string;
  created_at: Date;
  products?: { count: number }[];
}