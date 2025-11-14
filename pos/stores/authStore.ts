import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CASHIER';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string): Promise<boolean> => {
        try {
          console.log('Attempting login for:', email);
          
          // First try real API login
          try {
            const response = await fetch('http://192.168.0.211:3001/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
              const data = await response.json();
              const { token, user } = data;

              set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
              });

              // Store in AsyncStorage for persistence
              await AsyncStorage.setItem('auth-token', token);
              await AsyncStorage.setItem('auth-user', JSON.stringify(user));

              console.log('API login successful', { user: user.email, hasToken: !!token });
              return true;
            }
          } catch (apiError) {
            console.warn('API login failed, trying demo credentials:', apiError);
          }

          // Fallback to demo credentials if API login fails
          if ((email === 'cashier@techzu.com' && password === 'cashier123') ||
              (email === 'admin@techzu.com' && password === 'admin123')) {
            
            console.log('Using demo credentials for offline mode');
            
            const demoUser = {
              id: email === 'admin@techzu.com' ? 'admin-1' : 'cashier-1',
              email: email,
              role: email === 'admin@techzu.com' ? 'ADMIN' as const : 'CASHIER' as const,
            };
            
            const demoToken = 'demo-token-' + Date.now();
            
            set({
              user: demoUser,
              token: demoToken,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Store in AsyncStorage for persistence
            await AsyncStorage.setItem('auth-token', demoToken);
            await AsyncStorage.setItem('auth-user', JSON.stringify(demoUser));
            
            console.log('Demo login successful (offline mode)', { user: demoUser, isAuthenticated: true });
            return true;
          }

          return false;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },

      logout: async () => {
        // Clear AsyncStorage
        await AsyncStorage.multiRemove(['auth-token', 'auth-user']);
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      initializeAuth: async () => {
        try {
          console.log('Initializing auth...');
          const token = await AsyncStorage.getItem('auth-token');
          const userString = await AsyncStorage.getItem('auth-user');
          
          console.log('Auth data from AsyncStorage:', { 
            hasToken: !!token, 
            hasUser: !!userString 
          });
          
          if (token && userString) {
            const user = JSON.parse(userString);
            console.log('Setting authenticated state:', { user: user.email });
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            console.log('No auth data found, staying unauthenticated');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Auth store rehydrated:', {
          user: state?.user?.email,
          isAuthenticated: state?.isAuthenticated,
          hasToken: !!state?.token
        });
        // Set loading to false after rehydration
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);