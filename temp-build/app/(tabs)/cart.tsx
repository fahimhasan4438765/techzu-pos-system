import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCartStore, CartItem } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CartScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const {
    items,
    subtotal_cents,
    tax_cents,
    total_cents,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCartStore();
  
  const { isAuthenticated } = useAuthStore();

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleQuantityChange = (productId: string, change: number) => {
    const item = items.find(item => item.product.id === productId);
    if (item) {
      const newQuantity = item.quantity + change;
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeItem(productId) },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please log in to complete your order.');
      return;
    }
    
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checking out.');
      return;
    }

    // Navigate to modal for checkout
    router.push('/modal');
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={[styles.cartItem, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7' }]}>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={[styles.itemSku, { color: colors.tabIconDefault }]}>
          SKU: {item.product.sku}
        </Text>
        <Text style={[styles.itemPrice, { color: colors.text }]}>
          {formatCurrency(item.product.price_cents)} × {item.quantity}
        </Text>
      </View>
      
      <View style={styles.itemControls}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={[styles.quantityButton, { backgroundColor: colors.tabIconDefault }]}
            onPress={() => handleQuantityChange(item.product.id, -1)}
          >
            <IconSymbol name="minus" size={16} color={colors.background} />
          </TouchableOpacity>
          
          <Text style={[styles.quantity, { color: colors.text }]}>
            {item.quantity}
          </Text>
          
          <TouchableOpacity
            style={[styles.quantityButton, { backgroundColor: colors.tint }]}
            onPress={() => handleQuantityChange(item.product.id, 1)}
          >
            <IconSymbol name="plus" size={16} color={colors.background} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.product.id)}
        >
          <IconSymbol name="trash" size={20} color="#ff3b30" />
        </TouchableOpacity>
        
        <Text style={[styles.lineTotal, { color: colors.text }]}>
          {formatCurrency(item.line_total_cents)}
        </Text>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Shopping Cart</Text>
        </View>
        
        <View style={styles.emptyCart}>
          <IconSymbol name="cart" size={80} color={colors.tabIconDefault} />
          <Text style={[styles.emptyCartText, { color: colors.tabIconDefault }]}>
            Your cart is empty
          </Text>
          <Text style={[styles.emptyCartSubtext, { color: colors.tabIconDefault }]}>
            Add some products to get started
          </Text>
          <TouchableOpacity
            style={[styles.shopButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[styles.shopButtonText, { color: colors.background }]}>
              Shop Products
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Shopping Cart</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={[styles.clearButton, { color: '#ff3b30' }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id}
        style={styles.cartList}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.totalsContainer, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7', borderTopColor: colors.tabIconDefault }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.tabIconDefault }]}>Subtotal</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {formatCurrency(subtotal_cents)}
          </Text>
        </View>
        
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.tabIconDefault }]}>Tax</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {formatCurrency(tax_cents)}
          </Text>
        </View>
        
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[styles.grandTotalValue, { color: colors.text }]}>
            {formatCurrency(total_cents)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.checkoutButton, { backgroundColor: colors.tint }]}
          onPress={handleCheckout}
        >
          <Text style={[styles.checkoutButtonText, { color: colors.background }]}>
            Proceed to Checkout
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  clearButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  cartList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 12,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemControls: {
    alignItems: 'flex-end',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
    marginBottom: 8,
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCartText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  shopButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalsContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});