import * as SQLite from 'expo-sqlite';

export interface LocalProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  barcode?: string;
  image?: string;
  lastUpdated: string;
}

export interface LocalOrder {
  id?: number;
  serverOrderId?: number;
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  tax: number;
  paymentMethod: 'CASH' | 'CARD' | 'QR';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  synced: boolean;
  cashierId: number;
}

export interface SyncQueue {
  id?: number;
  type: 'CREATE_ORDER' | 'UPDATE_PRODUCT' | 'UPDATE_ORDER_STATUS';
  data: string; // JSON stringified data
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      console.log('Opening database...');
      this.db = await SQLite.openDatabaseAsync('techzu_pos.db');
      console.log('Database opened successfully');
      
      console.log('Creating tables...');
      await this.createTables();
      console.log('Tables created successfully');

      // Verify tables exist
      const tables = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      console.log('Available tables:', tables);

      // Seed development data if needed
      await this.seedDevelopmentData();
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Products table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        barcode TEXT,
        image TEXT,
        lastUpdated TEXT NOT NULL
      );
    `);

    // Orders table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serverOrderId INTEGER,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        tax REAL NOT NULL DEFAULT 0,
        paymentMethod TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        createdAt TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        cashierId INTEGER NOT NULL
      );
    `);

    // Sync queue table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        lastAttempt TEXT
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(createdAt);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON sync_queue(type);
    `);
  }

  // Product operations
  async saveProducts(products: LocalProduct[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.withTransactionAsync(async () => {
      // Clear existing products
      await this.db!.runAsync('DELETE FROM products');
      
      // Insert new products
      for (const product of products) {
        await this.db!.runAsync(
          `INSERT INTO products (id, name, price, stock, category, barcode, image, lastUpdated) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.id,
            product.name,
            product.price,
            product.stock,
            product.category || null,
            product.barcode || null,
            product.image || null,
            product.lastUpdated
          ]
        );
      }
    });
  }

  async getProducts(): Promise<LocalProduct[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync('SELECT * FROM products ORDER BY name');
    return result as LocalProduct[];
  }

  async getProductByBarcode(barcode: string): Promise<LocalProduct | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT * FROM products WHERE barcode = ?',
      [barcode]
    );
    return result as LocalProduct | null;
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM products WHERE name LIKE ? OR category LIKE ? ORDER BY name',
      [`%${query}%`, `%${query}%`]
    );
    return result as LocalProduct[];
  }

  async updateProductStock(productId: number, newStock: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE products SET stock = ? WHERE id = ?',
      [newStock, productId]
    );
  }

  // Order operations
  async saveOrder(order: Omit<LocalOrder, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Database saveOrder called with:', JSON.stringify(order, null, 2));
      
      const result = await this.db.runAsync(
        `INSERT INTO orders (serverOrderId, items, total, tax, paymentMethod, status, createdAt, synced, cashierId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.serverOrderId || null,
          JSON.stringify(order.items),
          order.total,
          order.tax,
          order.paymentMethod,
          order.status,
          order.createdAt,
          order.synced ? 1 : 0,
          order.cashierId
        ]
      );

      console.log('Order saved successfully with ID:', result.lastInsertRowId);
      return result.lastInsertRowId!;
    } catch (error) {
      console.error('Database saveOrder error:', error);
      console.error('Order data that failed:', JSON.stringify(order, null, 2));
      throw error;
    }
  }

  async getOrders(limit: number = 20): Promise<LocalOrder[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM orders ORDER BY createdAt DESC LIMIT ?',
      [limit]
    );

    return (result as any[]).map(row => ({
      ...row,
      items: JSON.parse(row.items),
      synced: row.synced === 1
    }));
  }

  async getUnsyncedOrders(): Promise<LocalOrder[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM orders WHERE synced = 0 ORDER BY createdAt ASC'
    );

    return (result as any[]).map(row => ({
      ...row,
      items: JSON.parse(row.items),
      synced: false
    }));
  }

  async markOrderSynced(localOrderId: number, serverOrderId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE orders SET synced = 1, serverOrderId = ? WHERE id = ?',
      [serverOrderId, localOrderId]
    );
  }

  // Sync queue operations
  async addToSyncQueue(type: SyncQueue['type'], data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT INTO sync_queue (type, data, createdAt, attempts) VALUES (?, ?, ?, 0)',
      [type, JSON.stringify(data), new Date().toISOString()]
    );
  }

  async getSyncQueue(): Promise<SyncQueue[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM sync_queue ORDER BY createdAt ASC'
    );

    return (result as any[]).map(row => ({
      ...row,
      data: JSON.parse(row.data)
    }));
  }

  async updateSyncQueueAttempt(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE sync_queue SET attempts = attempts + 1, lastAttempt = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
  }

  async removeSyncQueueItem(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  // Utility methods
  async seedDevelopmentData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if products already exist
    const existingProducts = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM products');
    if ((existingProducts as any).count > 0) {
      console.log('Products already exist, skipping seed');
      return;
    }

    console.log('Seeding development data...');
    
    const sampleProducts = [
      {
        id: 1,
        name: 'Coffee - Espresso',
        price: 3.50,
        stock: 100,
        category: 'Beverages',
        barcode: '1234567890123',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Croissant - Plain',
        price: 2.25,
        stock: 50,
        category: 'Pastries',
        barcode: '1234567890124',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Sandwich - Ham & Cheese',
        price: 8.75,
        stock: 25,
        category: 'Food',
        barcode: '1234567890125',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 4,
        name: 'Water Bottle',
        price: 1.50,
        stock: 200,
        category: 'Beverages',
        barcode: '1234567890126',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 5,
        name: 'Muffin - Blueberry',
        price: 3.25,
        stock: 30,
        category: 'Pastries',
        barcode: '1234567890127',
        lastUpdated: new Date().toISOString()
      }
    ];

    await this.saveProducts(sampleProducts);
    console.log('Development data seeded successfully');
  }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.withTransactionAsync(async () => {
      await this.db!.runAsync('DELETE FROM products');
      await this.db!.runAsync('DELETE FROM orders');
      await this.db!.runAsync('DELETE FROM sync_queue');
    });
  }

  async getStorageStats(): Promise<{
    productCount: number;
    orderCount: number;
    unsyncedOrderCount: number;
    syncQueueCount: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const [productCount, orderCount, unsyncedOrderCount, syncQueueCount] = await Promise.all([
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM products'),
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM orders'),
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM orders WHERE synced = 0'),
      this.db.getFirstAsync('SELECT COUNT(*) as count FROM sync_queue'),
    ]);

    return {
      productCount: (productCount as any).count,
      orderCount: (orderCount as any).count,
      unsyncedOrderCount: (unsyncedOrderCount as any).count,
      syncQueueCount: (syncQueueCount as any).count,
    };
  }
}

export const databaseService = new DatabaseService();