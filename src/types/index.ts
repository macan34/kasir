export interface Store {
  id: number | string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Category {
  id: number | string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: number | string;
  name: string;
  sku: string;
  barcode: string | null;
  category_id: number | string | null;
  store_id: number | string | null;
  price: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category;
}

export interface Sale {
  id: number | string;
  invoice_number: string;
  store_id: number | string | null;
  customer_name: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  stores?: Store;
}

export interface SaleItem {
  id: number | string;
  sale_id: number | string;
  product_id: number | string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface ProductInput {
  name: string;
  sku: string;
  barcode?: string | null;
  category_id: number | string | null;
  store_id: number | string | null;
  price: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  image_url?: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
