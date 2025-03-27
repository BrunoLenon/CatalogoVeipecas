export type UserRole = 'master' | 'admin' | 'seller' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  cnpj_cpf: string;
  seller_id?: string;
  status: boolean;
  last_login?: Date;
  avatar_url?: string;
}