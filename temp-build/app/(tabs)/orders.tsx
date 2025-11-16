import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '@/stores/authStore';
import { syncService, SyncStatus } from '@/services/sync';
import { LocalOrder } from '@/services/database';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Debug logging
  console.log('OrdersScreen - Auth state:', { 
    isAuthenticated, 
    user: user?.email, 
    isLoading 
  });

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34c759';
      case 'pending':
        return '#ff9500';
      case 'void':
        return '#ff3b30';
      default:
        return colors.tabIconDefault;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return 'banknote';
      case 'card':
        return 'creditcard';
      case 'qr':
        return 'qrcode';
      default:
        return 'questionmark.circle';
    }
  };

  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    
    try {
      const data = await syncService.getOrders(20);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const renderOrderItem = ({ item }: { item: LocalOrder }) => (
    <TouchableOpacity style={[styles.orderItem, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7' }]}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderId, { color: colors.text }]} numberOfLines={1}>
            Order #{item.id || 'Local'}
          </Text>
          <Text style={[styles.orderDate, { color: colors.tabIconDefault }]}>
            {item.createdAt ? formatDate(item.createdAt) : 'Unknown date'}
          </Text>
        </View>
        
        <View style={styles.orderStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.paymentMethod}>
          <IconSymbol 
            name={getPaymentMethodIcon(item.paymentMethod.toLowerCase())} 
            size={16} 
            color={colors.tabIconDefault} 
          />
          <Text style={[styles.paymentText, { color: colors.tabIconDefault }]}>
            {item.paymentMethod}
          </Text>
        </View>
        
        <View style={styles.orderTotals}>
          <Text style={[styles.orderTotal, { color: colors.text }]}>
            {formatCurrency(item.total * 100)}
          </Text>
          <Text style={[styles.itemCount, { color: colors.tabIconDefault }]}>
            {item.items?.length || 0} items
          </Text>
        </View>
      </View>

      {item.items && item.items.length > 0 && (
        <View style={styles.orderItems}>
          {item.items.slice(0, 3).map((orderItem: any, index: number) => (
            <Text key={index} style={[styles.itemText, { color: colors.tabIconDefault }]} numberOfLines={1}>
              {orderItem.quantity}× {orderItem.productName || 'Unknown item'}
            </Text>
          ))}
          {item.items.length > 3 && (
            <Text style={[styles.moreItems, { color: colors.tabIconDefault }]}>
              +{item.items.length - 3} more items
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Order History</Text>
        </View>
        
        <View style={styles.authRequired}>
          <IconSymbol name="person.circle" size={80} color={colors.tabIconDefault} />
          <Text style={[styles.authRequiredText, { color: colors.tabIconDefault }]}>
            Authentication Required
          </Text>
          <Text style={[styles.authRequiredSubtext, { color: colors.tabIconDefault }]}>
            Please log in to view your order history
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Order History</Text>
        </View>
        
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
            Loading orders...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Order History</Text>
        </View>
        
        <View style={styles.emptyOrders}>
          <IconSymbol name="list.clipboard" size={80} color={colors.tabIconDefault} />
          <Text style={[styles.emptyOrdersText, { color: colors.tabIconDefault }]}>
            No orders yet
          </Text>
          <Text style={[styles.emptyOrdersSubtext, { color: colors.tabIconDefault }]}>
            Your completed orders will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Order History</Text>
        <TouchableOpacity onPress={fetchOrders}>
          <IconSymbol name="arrow.clockwise" size={24} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        style={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  ordersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  orderItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
  },
  orderStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  orderTotals: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
  },
  orderItems: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 12,
  },
  itemText: {
    fontSize: 12,
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authRequiredText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  authRequiredSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyOrders: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyOrdersText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyOrdersSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
});