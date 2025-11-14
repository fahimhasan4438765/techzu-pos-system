import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCartStore } from '@/stores/cartStore';
import { syncService } from '@/services/sync';
import { LocalProduct } from '@/services/database';
import { IconSymbol } from '@/components/ui/icon-symbol';
import BarcodeInput from '@/components/BarcodeInput';

// Dynamically import BarCodeScanner to handle native module errors
let BarCodeScanner: any = null;
try {
  const module = require('expo-barcode-scanner');
  BarCodeScanner = module.BarCodeScanner;
} catch (error) {
  console.warn('BarCodeScanner native module not available:', error);
}

const { width, height } = Dimensions.get('window');

export default function BarcodeScannerScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { addItem } = useCartStore();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      if (!BarCodeScanner) {
        setHasPermission(false);
        return;
      }
      
      try {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.warn('Failed to get camera permissions:', error);
        setHasPermission(false);
      }
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setScanning(false);

    try {
      // Look up product by barcode
      const product = await syncService.getProductByBarcode(data);
      
      if (product) {
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

        // Add to cart
        addItem(apiProduct);
        
        Alert.alert(
          'Product Found!',
          `${product.name} has been added to your cart.\nPrice: $${product.price.toFixed(2)}`,
          [
            {
              text: 'Continue Scanning',
              onPress: () => {
                setScanned(false);
                setScanning(true);
              },
            },
            {
              text: 'Go to Cart',
              onPress: () => router.push('/(tabs)/cart'),
            },
          ]
        );
      } else {
        // Product not found
        Alert.alert(
          'Product Not Found',
          `No product found with barcode: ${data}`,
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanned(false);
                setScanning(true);
              },
            },
            {
              text: 'Manual Search',
              onPress: () => router.push('/(tabs)'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Alert.alert(
        'Error',
        'Failed to lookup product. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setScanning(true);
            },
          },
        ]
      );
    }
  };

  const handleManualEntry = () => {
    Alert.prompt(
      'Manual Barcode Entry',
      'Enter the barcode manually:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Search',
          onPress: (barcode?: string) => {
            if (barcode && barcode.trim()) {
              handleBarCodeScanned({ type: 'manual', data: barcode.trim() });
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.message, { color: colors.text }]}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false || !BarCodeScanner) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Barcode Scanner</Text>
          <View style={styles.placeholder} />
        </View>
        
        <BarcodeInput onClose={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: 'white' }]}>Scan Barcode</Text>
        <TouchableOpacity onPress={handleManualEntry} style={styles.manualButton}>
          <IconSymbol name="keyboard" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.scannerContainer}>
        {scanning && (
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.scanner}
          />
        )}
        
        {/* Scanner Overlay */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleOverlay}>
            <View style={styles.leftOverlay} />
            <View style={styles.scanWindow}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {scanning && (
                <View style={styles.scanLine} />
              )}
            </View>
            <View style={styles.rightOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <Text style={styles.instructionText}>
              {scanning ? 'Position barcode within the frame to scan' : 'Scanning...'}
            </Text>
            
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => {
                  setScanned(false);
                  setScanning(!scanning);
                }}
              >
                <IconSymbol 
                  name={scanning ? "pause.fill" : "play.fill"} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.controlButtonText}>
                  {scanning ? 'Pause' : 'Resume'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => router.push('/(tabs)/cart')}
              >
                <IconSymbol name="cart.fill" size={24} color="white" />
                <Text style={styles.controlButtonText}>Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
  },
  manualButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  settingsButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  middleOverlay: {
    flexDirection: 'row',
    height: 200,
  },
  leftOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  rightOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanWindow: {
    width: 200,
    height: 200,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#00ff00',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00ff00',
  },
  bottomOverlay: {
    flex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});