const API_BASE = '/api';

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const errorBody = await res.text();
    let message = errorBody || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (typeof parsed.error === 'string') message = parsed.error;
    } catch {
      // Keep plain-text API errors as-is.
    }
    throw new Error(message);
  }
  return res.json();
}

export interface ProductInput {
  name: string;
  sku: string;
  barcode?: string | null;
  category_id: string | number | null;
  store_id: string | number | null;
  price: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  image_url?: string | null;
}

export interface CustomerRecord {
  id: number | string;
  name: string;
  city?: string | null;
  created_at?: string;
  member_ref: string | null;
  is_member: boolean | number;
  member_discount: number;
}

export const api = {
  stores: {
    getAll: async () => {
      return fetchJSON(`${API_BASE}/stores`);
    },
    create: async (data: { name: string; address?: string }) => {
      return fetchJSON(`${API_BASE}/stores`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  categories: {
    getAll: async () => {
      return fetchJSON(`${API_BASE}/categories`);
    },
    create: async (data: { name: string; description?: string }) => {
      return fetchJSON(`${API_BASE}/categories`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: { name: string }) => {
      return fetchJSON(`${API_BASE}/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number) => {
      return fetchJSON(`${API_BASE}/categories/${id}`, {
        method: 'DELETE',
      });
    },
  },

  products: {
    getAll: async () => {
      return fetchJSON(`${API_BASE}/products`);
    },
    create: async (data: ProductInput) => {
      return fetchJSON(`${API_BASE}/products`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<ProductInput>) => {
      return fetchJSON(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number) => {
      return fetchJSON(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
      });
    },
    updateStock: async (id: string | number, stock_quantity: number) => {
      return fetchJSON(`${API_BASE}/products/${id}/stock`, {
        method: 'PUT',
        body: JSON.stringify({ stock_quantity }),
      });
    },
  },

  sales: {
    getAll: async (params?: { dateFrom?: string }) => {
      const query = new URLSearchParams();
      if (params?.dateFrom) query.set('date_from', params.dateFrom);
      const qs = query.toString();
      return fetchJSON(`${API_BASE}/sales${qs ? `?${qs}` : ''}`);
    },
    getById: async (id: string | number) => {
      return fetchJSON(`${API_BASE}/sales/${id}`);
    },
    create: async (data: {
      invoice_number: string;
      store_id: string | number | null;
      customer_name: string | null;
      subtotal: number;
      tax_amount: number;
      discount_amount: number;
      total: number;
      payment_method: string;
      payment_status: string;
    }) => {
      return fetchJSON(`${API_BASE}/sales`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    getCustomers: async () => {
      return fetchJSON(`${API_BASE}/sales/customers`);
    },
  },

  saleItems: {
    createMany: async (items: {
      sale_id: string | number;
      product_id: string | number;
      product_name: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }[]) => {
      return fetchJSON(`${API_BASE}/sale-items`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    },
  },

  customers: {
    getAll: async (): Promise<CustomerRecord[]> => {
      return fetchJSON(`${API_BASE}/customers`);
    },
    create: async (data: {
      name: string;
      city?: string;
      member_ref?: string | null;
      is_member: boolean;
      member_discount: number;
    }) => {
      return fetchJSON(`${API_BASE}/customers`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: {
      name: string;
      city?: string;
      member_ref?: string | null;
      is_member: boolean;
      member_discount: number;
    }) => {
      return fetchJSON(`${API_BASE}/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    getMemberSettings: async (): Promise<{ default_member_discount: number }> => {
      return fetchJSON(`${API_BASE}/customers/member-settings`);
    },
    updateMemberSettings: async (default_member_discount: number): Promise<{ default_member_discount: number }> => {
      return fetchJSON(`${API_BASE}/customers/member-settings`, {
        method: 'PUT',
        body: JSON.stringify({ default_member_discount }),
      });
    },
    delete: async (id: string | number) => {
      return fetchJSON(`${API_BASE}/customers/${id}`, {
        method: 'DELETE',
      });
    },
  },

  stock: {
    getAll: async () => {
      return fetchJSON(`${API_BASE}/stock`);
    },
    adjust: async (data: {
      product_id: string | number;
      adjustment_type: 'add' | 'subtract' | 'set';
      quantity: number;
      notes?: string;
    }) => {
      return fetchJSON(`${API_BASE}/stock/adjust`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  logs: {
    getAll: async () => {
      return fetchJSON(`${API_BASE}/logs`);
    },
    getCustomerChanges: async () => {
      return fetchJSON(`${API_BASE}/logs/customer-changes`);
    },
  },
};
