import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { syncService, SyncStatus } from '@/services/sync';
import { LocalProduct } from '@/services/database';
import { useCartStore } from '@/stores/cartStore';
import { useRouter } from 'expo-router';

export default function ProductsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<LocalProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const { addItem } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    loadProducts();
    
    // Listen to sync status changes
    const unsubscribe = syncService.addStatusListener(setSyncStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      console.log('Loading products...');
      
      // Ensure sync service is initialized before trying to get products
      await syncService.initialize();
      const loadedProducts = await syncService.getProducts();
      console.log('Products loaded:', loadedProducts.length);
      setProducts(loadedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert(
        'Loading Error',
        'Failed to load products. Please try again.',
        [{ text: 'Retry', onPress: loadProducts }]
      );
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleAddToCart = (product: LocalProduct) => {
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
      return;
    }

    // Convert LocalProduct to API Product format for cart
    const apiProduct = {
      id: product.id.toString(),
      sku: product.barcode || `SKU-${product.id}`,
      name: product.name,
      price_cents: Math.round(product.price * 100),
      category: product.category || 'General',
      tax_rate: 0.1, // 10% tax rate
      image_url: product.image,
      created_at: new Date().toISOString(),
      updated_at: product.lastUpdated,
    };

    addItem(apiProduct);
    Alert.alert('Added to Cart', `${product.name} added to cart`);
  };

  const handleRefresh = async () => {
    if (syncStatus.isOnline) {
      try {
        await syncService.forceSyncNow();
        await loadProducts();
      } catch (error) {
        Alert.alert('Sync Failed', 'Unable to sync with server');
      }
    } else {
      await loadProducts();
    }
  };

  const renderProduct = ({ item }: { item: LocalProduct }) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: colors.background }]}
      onPress={() => handleAddToCart(item)}
      disabled={item.stock <= 0}
    >
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      )}
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.category && (
          <Text style={[styles.productCategory, { color: colors.icon }]}>
            {item.category}
          </Text>
        )}
        <View style={styles.productFooter}>
          <Text style={[styles.productPrice, { color: colors.tint }]}>
            ${item.price.toFixed(2)}
          </Text>
          <Text style={[styles.productStock, { 
            color: item.stock > 0 ? colors.icon : '#ff4444' 
          }]}>
            Stock: {item.stock}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>Products</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/barcode-scanner')}
          >
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
          <View style={styles.syncStatus}>
            <View style={[styles.syncIndicator, { 
              backgroundColor: syncStatus.isOnline ? '#4CAF50' : '#FF9800' 
            }]} />
            <Text style={[styles.syncText, { color: colors.icon }]}>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>
      
      <TextInput
        style={[styles.searchInput, { 
          backgroundColor: colors.background,
          borderColor: colors.icon,
          color: colors.text 
        }]}
        placeholder="Search products..."
        placeholderTextColor={colors.icon}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      <Text style={[styles.resultsCount, { color: colors.icon }]}>
        {filteredProducts.length} products
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              {isLoading ? 'Loading products...' : 'No products found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchInput: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    fontSize: 16,
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  productCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  productCategory: {
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.7,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  productStock: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
