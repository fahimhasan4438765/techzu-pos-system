import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { syncService } from '@/services/sync';
import { useCartStore } from '@/stores/cartStore';
import { LocalProduct } from '@/services/database';
import { Product } from '@/services/apiService';

interface BarcodeInputProps {
  onClose: () => void;
}

// Helper function to convert LocalProduct to Product for cart compatibility
const convertLocalProductToProduct = (localProduct: LocalProduct): Product => ({
  id: localProduct.id.toString(),
  sku: localProduct.barcode || '',
  name: localProduct.name,
  price_cents: Math.round(localProduct.price * 100),
  category: localProduct.category || '',
  tax_rate: 0.1, // 10% default tax rate
  image_url: localProduct.image,
  created_at: localProduct.lastUpdated,
  updated_at: localProduct.lastUpdated,
});

export default function BarcodeInput({ onClose }: BarcodeInputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addItem } = useCartStore();

  const handleLookup = async () => {
    if (!barcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    setIsLoading(true);
    try {
      const product = await syncService.getProductByBarcode(barcode.trim());
      
      if (product) {
        const cartProduct = convertLocalProductToProduct(product);
        addItem(cartProduct);
        Alert.alert(
          'Product Added',
          `${product.name} has been added to your cart`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert('Product Not Found', 'No product found with this barcode');
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Alert.alert('Error', 'Failed to lookup product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = (sampleBarcode: string, productName: string) => {
    setBarcode(sampleBarcode);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Manual Barcode Entry
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Enter barcode manually or use quick add buttons
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.tabIconDefault,
              color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Enter barcode..."
          placeholderTextColor={colors.tabIconDefault}
          keyboardType="numeric"
          autoFocus
        />

        <View style={styles.quickAddSection}>
          <Text style={[styles.quickAddTitle, { color: colors.text }]}>
            Quick Add (Sample Products):
          </Text>
          <TouchableOpacity
            style={[styles.quickAddButton, { backgroundColor: colors.tint }]}
            onPress={() => handleQuickAdd('1234567890123', 'Coffee - Espresso')}
          >
            <Text style={styles.quickAddButtonText}>Coffee - Espresso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAddButton, { backgroundColor: colors.tint }]}
            onPress={() => handleQuickAdd('1234567890124', 'Croissant - Plain')}
          >
            <Text style={styles.quickAddButtonText}>Croissant - Plain</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAddButton, { backgroundColor: colors.tint }]}
            onPress={() => handleQuickAdd('1234567890125', 'Sandwich - Ham & Cheese')}
          >
            <Text style={styles.quickAddButtonText}>Sandwich - Ham & Cheese</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { backgroundColor: colors.tabIconDefault }]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.lookupButton,
              { backgroundColor: colors.tint },
              isLoading && styles.disabledButton,
            ]}
            onPress={handleLookup}
            disabled={isLoading}
          >
            <Text style={styles.lookupButtonText}>
              {isLoading ? 'Looking up...' : 'Lookup Product'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  quickAddSection: {
    marginBottom: 20,
  },
  quickAddTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  quickAddButton: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  quickAddButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  lookupButton: {
    backgroundColor: '#007bff',
  },
  lookupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});