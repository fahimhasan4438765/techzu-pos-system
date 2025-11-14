import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService, LocalOrder, LocalProduct } from './database';
import { apiService, Product } from './apiService';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  isSyncing: boolean;
  pendingSync: number;
}

class SyncService {
  private syncInterval: any = null;
  private isOnline: boolean = true;
  private lastSync: Date | null = null;
  private isSyncing: boolean = false;
  private listeners: Array<(status: SyncStatus) => void> = [];

  async initialize(): Promise<void> {
    try {
      console.log('Initializing sync service...');
      
      // Initialize database
      console.log('Initializing database service...');
      await databaseService.initialize();
      console.log('Database service initialized successfully');

      // Monitor network status
      NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;
        
        if (!wasOnline && this.isOnline) {
          // Just came online, sync immediately
          this.performSync();
        }
        
        this.notifyListeners();
      });

      // Initial network check
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;
      console.log('Network status:', this.isOnline ? 'online' : 'offline');

      // Start periodic sync (every 5 minutes when online)
      this.startPeriodicSync();

      // Initial sync if online
      if (this.isOnline) {
        console.log('Starting initial sync...');
        this.performSync();
      }

      console.log('Sync service initialized successfully');
    } catch (error) {
      console.error('Sync service initialization failed:', error);
      throw error;
    }
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.performSync();
      }
    }, 3 * 60 * 1000); // 3 minutes
  }

    async performSync(): Promise<void> {
    if (this.isSyncing) return;

    // Only attempt sync if online
    if (!this.isOnline) {
      console.log('Skipping sync - offline');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      await this.syncProducts();
      await this.syncOrders();
      await this.processSyncQueue();

      this.lastSync = new Date();
      console.log('Sync completed successfully');
    } catch (error) {
      console.warn('Sync failed (continuing offline):', error);
      // Don't throw error - allow app to work offline
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async syncProducts(): Promise<void> {
    try {
      console.log('Syncing products from server...');
      const products = await apiService.getProducts();
      console.log('Received products:', products.length);
      
      const localProducts: LocalProduct[] = products.map((product: Product) => ({
        id: parseInt(product.id), // Convert string ID to number
        name: product.name,
        price: product.price_cents / 100, // Convert cents to dollars
        stock: 100, // Default stock since API doesn't provide it
        category: product.category,
        barcode: product.sku, // Use SKU as barcode
        image: product.image_url,
        lastUpdated: new Date().toISOString()
      }));

      await databaseService.saveProducts(localProducts);
      console.log('Products synced successfully');
    } catch (error) {
      console.warn('Failed to sync products from server (using local data):', error);
      // Don't throw error - allow app to use local/seed data
    }
  }

  private async syncOrders(): Promise<void> {
    try {
      // Check if we have a valid API token (not a demo token)
      const token = await AsyncStorage.getItem('auth-token');
      if (!token || token.startsWith('demo-token-')) {
        console.log('Skipping order sync - using demo authentication (offline mode)');
        return;
      }

      const unsyncedOrders = await databaseService.getUnsyncedOrders();
      console.log(`Found ${unsyncedOrders.length} unsynced orders`);
      
      for (const localOrder of unsyncedOrders) {
        try {
          console.log(`Syncing order ${localOrder.id} to server...`);
          
          // Convert local order format to API format
          const orderItems = localOrder.items.map(item => ({
            productId: item.productId.toString(),
            qty: item.quantity
          }));

          // Create order on server
          const serverOrder = await apiService.createOrder({
            paymentMethod: localOrder.paymentMethod.toLowerCase() as 'cash' | 'card' | 'qr',
            items: orderItems,
            clientCreatedAt: localOrder.createdAt
          });

          console.log(`Order synced successfully with server ID: ${serverOrder.orderId}`);

          // Mark as synced in local database (convert string ID to number for local storage)
          await databaseService.markOrderSynced(localOrder.id!, parseInt(serverOrder.orderId));
          
          // Update local stock
          for (const item of localOrder.items) {
            const localProduct = await databaseService.getProducts();
            const product = localProduct.find(p => p.id === item.productId);
            if (product) {
              await databaseService.updateProductStock(
                item.productId, 
                Math.max(0, product.stock - item.quantity)
              );
            }
          }
        } catch (error) {
          console.error(`Failed to sync order ${localOrder.id}:`, error);
          // Add to sync queue for retry
          await databaseService.addToSyncQueue('CREATE_ORDER', {
            localOrderId: localOrder.id,
            orderData: localOrder
          });
        }
      }
    } catch (error) {
      console.error('Failed to sync orders:', error);
      throw error;
    }
  }

  private async processSyncQueue(): Promise<void> {
    try {
      const syncQueue = await databaseService.getSyncQueue();
      
      for (const item of syncQueue) {
        try {
          switch (item.type) {
            case 'CREATE_ORDER':
              await this.handleCreateOrderSync(item.data);
              await databaseService.removeSyncQueueItem(item.id!);
              break;
            
            case 'UPDATE_PRODUCT':
              await this.handleProductUpdate(item.data);
              await databaseService.removeSyncQueueItem(item.id!);
              break;
            
            case 'UPDATE_ORDER_STATUS':
              await this.handleOrderStatusUpdate(item.data);
              await databaseService.removeSyncQueueItem(item.id!);
              break;
          }
        } catch (error) {
          console.error(`Failed to process sync queue item ${item.id}:`, error);
          await databaseService.updateSyncQueueAttempt(item.id!);
          
          // Remove items that have failed too many times (>5 attempts)
          if (item.attempts >= 5) {
            await databaseService.removeSyncQueueItem(item.id!);
          }
        }
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
      throw error;
    }
  }

  private async handleCreateOrderSync(data: any): Promise<void> {
    const { localOrderId, orderData } = data;
    
    // Convert local order format to API format
    const orderItems = orderData.items.map((item: any) => ({
      productId: item.productId.toString(),
      qty: item.quantity
    }));

    const serverOrder = await apiService.createOrder({
      paymentMethod: orderData.paymentMethod.toLowerCase() as 'cash' | 'card' | 'qr',
      items: orderItems,
      clientCreatedAt: orderData.createdAt
    });

    await databaseService.markOrderSynced(localOrderId, parseInt(serverOrder.orderId));
  }

  private async handleProductUpdate(data: any): Promise<void> {
    // Handle product updates if needed
    console.log('Product update sync:', data);
  }

  private async handleOrderStatusUpdate(data: any): Promise<void> {
    // Handle order status updates if needed
    console.log('Order status update sync:', data);
  }

  // Public methods for components to use
  async getProducts(): Promise<LocalProduct[]> {
    return await databaseService.getProducts();
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    return await databaseService.searchProducts(query);
  }

  async getProductByBarcode(barcode: string): Promise<LocalProduct | null> {
    return await databaseService.getProductByBarcode(barcode);
  }

  async createOrder(order: Omit<LocalOrder, 'id' | 'synced'>): Promise<number> {
    try {
      console.log('Creating order with data:', JSON.stringify(order, null, 2));
      
      const localOrderId = await databaseService.saveOrder({
        ...order,
        synced: false
      });

      console.log('Order saved with local ID:', localOrderId);

      // Try to sync immediately if online
      if (this.isOnline) {
        console.log('Attempting to sync order immediately');
        this.performSync();
      }

      return localOrderId;
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw error;
    }
  }

  async getOrders(limit?: number): Promise<LocalOrder[]> {
    return await databaseService.getOrders(limit);
  }

  async getUnsyncedOrdersCount(): Promise<number> {
    try {
      const unsyncedOrders = await databaseService.getUnsyncedOrders();
      return unsyncedOrders.length;
    } catch (error) {
      console.error('Error getting unsynced orders count:', error);
      return 0;
    }
  }

  async forceSyncNow(): Promise<void> {
    if (this.isOnline) {
      await this.performSync();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  async forceSyncOrders(): Promise<{ synced: number; errors: number }> {
    const token = await AsyncStorage.getItem('auth-token');
    if (!token || token.startsWith('demo-token-')) {
      throw new Error('Cannot sync orders - no valid API token. Please log in with real credentials.');
    }

    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    const unsyncedOrders = await databaseService.getUnsyncedOrders();
    let synced = 0;
    let errors = 0;

    console.log(`Attempting to sync ${unsyncedOrders.length} orders...`);

    for (const localOrder of unsyncedOrders) {
      try {
        const orderItems = localOrder.items.map(item => ({
          productId: item.productId.toString(),
          qty: item.quantity
        }));

        const serverOrder = await apiService.createOrder({
          paymentMethod: localOrder.paymentMethod.toLowerCase() as 'cash' | 'card' | 'qr',
          items: orderItems,
          clientCreatedAt: localOrder.createdAt
        });

        await databaseService.markOrderSynced(localOrder.id!, parseInt(serverOrder.orderId));
        synced++;
        console.log(`Order ${localOrder.id} synced successfully`);
      } catch (error) {
        console.error(`Failed to sync order ${localOrder.id}:`, error);
        errors++;
      }
    }

    console.log(`Sync complete: ${synced} synced, ${errors} errors`);
    return { synced, errors };
  }

  // Status and listeners
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSync: this.lastSync,
      isSyncing: this.isSyncing,
      pendingSync: 0 // Will be updated with real count
    };
  }

  addStatusListener(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async notifyListeners(): Promise<void> {
    const stats = await databaseService.getStorageStats();
    const status: SyncStatus = {
      isOnline: this.isOnline,
      lastSync: this.lastSync,
      isSyncing: this.isSyncing,
      pendingSync: stats.unsyncedOrderCount + stats.syncQueueCount
    };

    this.listeners.forEach(listener => listener(status));
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners = [];
  }
}

export const syncService = new SyncService();