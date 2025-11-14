import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { syncService } from '@/services/sync';
import { receiptService } from '@/services/receipt';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type PaymentMethod = 'cash' | 'card' | 'qr';

export default function CheckoutModal() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const { items, total_cents, subtotal_cents, tax_cents, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: 'banknote' },
    { id: 'card', name: 'Card', icon: 'creditcard' },
    { id: 'qr', name: 'QR Code', icon: 'qrcode' },
  ];

  const handleCompleteOrder = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert('Error', 'Please log in to complete your order.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Your cart is empty.');
      return;
    }

    setProcessing(true);

    try {
      console.log('Starting order creation process...');
      console.log('User:', { id: user?.id, email: user?.email });
      console.log('Cart items:', items.length);
      
      // Prepare order data for local storage and sync
      const orderItems = items.map(item => ({
        productId: parseInt(item.product.id),
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price_cents / 100,
      }));

      const cashierId = user?.id === 'admin-1' ? 1 : user?.id === 'cashier-1' ? 2 : 1;
      console.log('Converted cashier ID:', cashierId);

      const orderData = {
        items: orderItems,
        total: total_cents / 100,
        tax: tax_cents / 100,
        paymentMethod: selectedPaymentMethod.toUpperCase() as 'CASH' | 'CARD' | 'QR',
        status: 'COMPLETED' as const,
        createdAt: new Date().toISOString(),
        cashierId: cashierId,
        // Note: synced is omitted here as it's added by the sync service
      };

      console.log('Order data prepared:', JSON.stringify(orderData, null, 2));

      // Save order locally (will sync when online)
      const localOrderId = await syncService.createOrder(orderData);
      console.log('Order created with local ID:', localOrderId);
      
      // Create full order object for receipt
      const fullOrderData = {
        ...orderData,
        id: localOrderId,
        synced: false,
      };
      
      Alert.alert(
        'Order Complete!',
        `Order #${localOrderId} has been processed successfully.\n\nTotal: ${formatCurrency(total_cents)}`,
        [
          {
            text: 'Print Receipt',
            onPress: async () => {
              try {
                await receiptService.quickPrint(
                  localOrderId,
                  fullOrderData,
                  user?.email?.split('@')[0] || 'Cashier'
                );
              } catch (error) {
                console.error('Receipt print error:', error);
              }
              clearCart();
              router.back();
            },
          },
          {
            text: 'Share Receipt',
            onPress: async () => {
              try {
                await receiptService.quickShare(
                  localOrderId,
                  fullOrderData,
                  user?.email?.split('@')[0] || 'Cashier'
                );
              } catch (error) {
                console.error('Receipt share error:', error);
              }
              clearCart();
              router.back();
            },
          },
          {
            text: 'Done',
            onPress: () => {
              clearCart();
              router.back();
            },
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Order creation error:', error);
      Alert.alert('Error', 'Failed to process order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const renderCartItem = ({ item }: { item: typeof items[0] }) => (
    <View style={[styles.cartItem, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f2f2f7' }]}>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {item.product.name}
        </Text>
        <Text style={[styles.itemDetails, { color: colors.tabIconDefault }]}>
          {formatCurrency(item.product.price_cents)} × {item.quantity}
        </Text>
      </View>
      <Text style={[styles.itemTotal, { color: colors.text }]}>
        {formatCurrency(item.line_total_cents)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Checkout',
          presentation: 'modal',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.cancelButton, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          ),
        }} 
      />

      <View style={styles.content}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            style={styles.cartList}
            scrollEnabled={false}
          />
        </View>

        {/* Totals */}
        <View style={[styles.totalsSection, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7' }]}>
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
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  {
                    backgroundColor: selectedPaymentMethod === method.id 
                      ? colors.tint + '20' 
                      : colorScheme === 'dark' ? '#2c2c2e' : '#f2f2f7',
                    borderColor: selectedPaymentMethod === method.id ? colors.tint : 'transparent',
                  }
                ]}
                onPress={() => setSelectedPaymentMethod(method.id as PaymentMethod)}
              >
                <IconSymbol 
                  name="banknote" 
                  size={24} 
                  color={selectedPaymentMethod === method.id ? colors.tint : colors.tabIconDefault} 
                />
                <Text style={[
                  styles.paymentMethodText, 
                  { 
                    color: selectedPaymentMethod === method.id ? colors.tint : colors.text 
                  }
                ]}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Complete Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.completeButton, 
            { 
              backgroundColor: processing ? colors.tabIconDefault : colors.tint,
            }
          ]}
          onPress={handleCompleteOrder}
          disabled={processing}
        >
          <Text style={[styles.completeButtonText, { color: colors.background }]}>
            {processing ? 'Processing...' : `Complete Order - ${formatCurrency(total_cents)}`}
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
  cancelButton: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cartList: {
    maxHeight: 200,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 14,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 4,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});