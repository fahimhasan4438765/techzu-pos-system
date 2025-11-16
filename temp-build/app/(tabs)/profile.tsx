import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { syncService, SyncStatus } from '@/services/sync';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const { user, isAuthenticated, logout, isLoading } = useAuthStore();
  const { clearCart } = useCartStore();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Debug logging
  console.log('ProfileScreen - Auth state:', { 
    isAuthenticated, 
    user: user?.email, 
    isLoading 
  });

  useEffect(() => {
    const checkUnsyncedOrders = async () => {
      try {
        const unsynced = await syncService.getUnsyncedOrdersCount();
        setUnsyncedCount(unsynced);
      } catch (error) {
        console.error('Error checking unsynced orders:', error);
      }
    };

    checkUnsyncedOrders();
    // Refresh every 30 seconds
    const interval = setInterval(checkUnsyncedOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            clearCart();
            // Navigate to login or products screen if needed
          },
        },
      ]
    );
  };

  const handleSyncData = async () => {
    try {
      Alert.alert(
        'Sync Data',
        'This will sync your offline orders with the server. Make sure you have an internet connection.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sync Now',
            onPress: async () => {
              try {
                const result = await syncService.forceSyncOrders();
                // Refresh unsynced count
                const newUnsyncedCount = await syncService.getUnsyncedOrdersCount();
                setUnsyncedCount(newUnsyncedCount);
                
                Alert.alert(
                  'Sync Complete',
                  `Successfully synced ${result.synced} orders.${result.errors > 0 ? ` ${result.errors} orders failed to sync.` : ''}`
                );
              } catch (error: any) {
                console.error('Sync error:', error);
                Alert.alert('Sync Failed', error.message || 'Failed to sync data');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Sync dialog error:', error);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data including offline orders and cart items. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            clearCart();
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    danger = false,
    rightElement 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      style={[styles.menuItem, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7' }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: danger ? '#ff3b3020' : colors.tint + '20' }
        ]}>
          <IconSymbol 
            name="gear" 
            size={20} 
            color={danger ? '#ff3b30' : colors.tint} 
          />
        </View>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuTitle, { color: danger ? '#ff3b30' : colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.menuSubtitle, { color: colors.tabIconDefault }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.menuItemRight}>
        {rightElement}
        {showArrow && !rightElement && (
          <IconSymbol name="chevron.right" size={16} color={colors.tabIconDefault} />
        )}
      </View>
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
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>
        
        <View style={styles.authRequired}>
          <IconSymbol name="person.circle" size={80} color={colors.tabIconDefault} />
          <Text style={[styles.authRequiredText, { color: colors.tabIconDefault }]}>
            Authentication Required
          </Text>
          <Text style={[styles.authRequiredSubtext, { color: colors.tabIconDefault }]}>
            Please log in to access your profile
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              router.push('/login');
            }}
          >
            <Text style={[styles.loginButtonText, { color: colors.background }]}>
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <View style={[styles.userCard, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7' }]}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.tint }]}>
              <Text style={[styles.avatarText, { color: colors.background }]}>
                {user?.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.email.split('@')[0]}
              </Text>
              <Text style={[styles.userEmail, { color: colors.tabIconDefault }]}>
                {user?.email}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.tint + '20' }]}>
                <Text style={[styles.roleText, { color: colors.tint }]}>
                  {user?.role}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
          
          <MenuItem
            icon="bell"
            title="Notifications"
            subtitle="Receive order updates and alerts"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.tabIconDefault, true: colors.tint }}
              />
            }
          />
          
          <MenuItem
            icon="speaker.wave.2"
            title="Sound Effects"
            subtitle="Play sounds for actions"
            showArrow={false}
            rightElement={
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: colors.tabIconDefault, true: colors.tint }}
              />
            }
          />
        </View>

        {/* Data & Storage Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data & Storage</Text>
          
          <MenuItem
            icon="info.circle"
            title="Sync Status"
            subtitle={`${syncService.getStatus().isOnline ? 'Online' : 'Offline'} • ${unsyncedCount} unsynced orders • Last sync: ${syncService.getStatus().lastSync ? syncService.getStatus().lastSync?.toLocaleDateString() : 'Never'}`}
            showArrow={false}
          />
          
          <MenuItem
            icon="arrow.clockwise"
            title="Sync Data"
            subtitle="Sync orders and products with server"
            onPress={handleSyncData}
          />
          
          <MenuItem
            icon="trash"
            title="Clear Cache"
            subtitle="Remove cached data and cart items"
            onPress={handleClearCache}
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
          
          <MenuItem
            icon="questionmark.circle"
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => Alert.alert('Help', 'Help & support functionality would be implemented here')}
          />
          
          <MenuItem
            icon="info.circle"
            title="About"
            subtitle="TechzuPOS Version 1.0.0"
            onPress={() => Alert.alert('About', 'TechzuPOS - Point of Sale System\nVersion 1.0.0\n\nDeveloped for modern retail operations')}
          />
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <MenuItem
            icon="rectangle.portrait.and.arrow.right"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            danger={true}
            showArrow={false}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>
            TechzuPOS v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
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
    marginBottom: 32,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
  },
});