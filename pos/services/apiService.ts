import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  price_cents: number;
  category: string;
  tax_rate: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: string;
  product_id: string;
  product?: Product;
  qty: number;
  unit_price_cents: number;
  tax_rate: number;
  line_total_cents: number;
}

export interface Order {
  id?: string;
  cashier_id?: string;
  payment_method: 'cash' | 'card' | 'qr';
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  status: 'completed' | 'void' | 'pending';
  created_at?: string;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  paymentMethod: 'cash' | 'card' | 'qr';
  items: Array<{
    productId: string;
    qty: number;
  }>;
  clientCreatedAt?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  totals: {
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
  };
}

export interface SyncOrdersRequest {
  orders: Array<{
    tempId: string;
    payload: CreateOrderRequest;
  }>;
}

export interface SyncOrdersResponse {
  results: Array<{
    tempId: string;
    orderId?: string;
    status: 'ok' | 'error';
    error?: string;
  }>;
}

const API_BASE_URL = 'http://192.168.0.211:3001/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, logout user
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  private async logout() {
    await AsyncStorage.multiRemove(['auth-token', 'auth-user']);
    // You might want to navigate to login screen here
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response: AxiosResponse = await this.client.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async register(email: string, password: string): Promise<void> {
    await this.client.post('/auth/register', {
      email,
      password,
    });
  }

  // Product endpoints
  async getProducts(): Promise<Product[]> {
    const response: AxiosResponse<Product[]> = await this.client.get('/products');
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    const response: AxiosResponse<Product> = await this.client.get(`/products/${id}`);
    return response.data;
  }

  // Order endpoints
  async createOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
    const response: AxiosResponse<CreateOrderResponse> = await this.client.post('/orders', orderData);
    return response.data;
  }

  async getOrders(limit: number = 20): Promise<Order[]> {
    const response: AxiosResponse<Order[]> = await this.client.get(`/orders?limit=${limit}`);
    return response.data;
  }

  async getOrder(id: string): Promise<Order> {
    const response: AxiosResponse<Order> = await this.client.get(`/orders/${id}`);
    return response.data;
  }

  // Sync endpoints for offline functionality
  async syncOrders(ordersData: SyncOrdersRequest): Promise<SyncOrdersResponse> {
    const response: AxiosResponse<SyncOrdersResponse> = await this.client.post('/sync/orders', ordersData);
    return response.data;
  }

  // Dashboard/Analytics endpoints (for admin users)
  async getDashboardStats(): Promise<any> {
    const response: AxiosResponse = await this.client.get('/dashboard/stats');
    return response.data;
  }

  // Network connectivity helper
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;