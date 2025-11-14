import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '@/services/apiService';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  line_total_cents: number;
}

interface CartState {
  items: CartItem[];
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  
  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  calculateTotals: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal_cents: 0,
      tax_cents: 0,
      total_cents: 0,

      addItem: (product: Product, quantity = 1) => {
        const state = get();
        const existingItemIndex = state.items.findIndex(item => item.product.id === product.id);
        
        let newItems: CartItem[];
        
        if (existingItemIndex >= 0) {
          // Update existing item
          newItems = state.items.map((item, index) => {
            if (index === existingItemIndex) {
              const newQuantity = item.quantity + quantity;
              const line_total_cents = Math.round(product.price_cents * newQuantity * (1 + product.tax_rate / 100));
              return {
                ...item,
                quantity: newQuantity,
                line_total_cents,
              };
            }
            return item;
          });
        } else {
          // Add new item
          const line_total_cents = Math.round(product.price_cents * quantity * (1 + product.tax_rate / 100));
          const newItem: CartItem = {
            id: product.id,
            product,
            quantity,
            line_total_cents,
          };
          newItems = [...state.items, newItem];
        }
        
        set({ items: newItems });
        get().calculateTotals();
      },

      removeItem: (productId: string) => {
        const state = get();
        const newItems = state.items.filter(item => item.product.id !== productId);
        set({ items: newItems });
        get().calculateTotals();
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const state = get();
        const newItems = state.items.map(item => {
          if (item.product.id === productId) {
            const line_total_cents = Math.round(item.product.price_cents * quantity * (1 + item.product.tax_rate / 100));
            return {
              ...item,
              quantity,
              line_total_cents,
            };
          }
          return item;
        });
        
        set({ items: newItems });
        get().calculateTotals();
      },

      clearCart: () => {
        set({
          items: [],
          subtotal_cents: 0,
          tax_cents: 0,
          total_cents: 0,
        });
      },

      calculateTotals: () => {
        const state = get();
        
        const subtotal_cents = state.items.reduce((total, item) => {
          return total + (item.product.price_cents * item.quantity);
        }, 0);

        const tax_cents = state.items.reduce((total, item) => {
          const itemSubtotal = item.product.price_cents * item.quantity;
          const itemTax = Math.round(itemSubtotal * (item.product.tax_rate / 100));
          return total + itemTax;
        }, 0);

        const total_cents = subtotal_cents + tax_cents;

        set({
          subtotal_cents: Math.round(subtotal_cents),
          tax_cents: Math.round(tax_cents),
          total_cents: Math.round(total_cents),
        });
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
      }),
      onRehydrateStorage: () => (state) => {
        // Recalculate totals after rehydration
        if (state) {
          state.calculateTotals();
        }
      },
    }
  )
);