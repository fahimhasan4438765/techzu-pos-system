import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import axios from 'axios';

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
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initializeAuth: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email,
            password,
          });

          const { token, user } = response.data;

          // Store token in httpOnly cookie (7 days)
          Cookies.set('auth-token', token, {
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
          });

          // Set axios default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error || 'Login failed. Please try again.';
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        // Remove token from cookie
        Cookies.remove('auth-token');
        
        // Remove axios default authorization header
        delete axios.defaults.headers.common['Authorization'];

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      initializeAuth: () => {
        const token = Cookies.get('auth-token');
        
        if (token) {
          // Set axios default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token validity by fetching user info
          axios.get(`${API_BASE_URL}/api/auth/me`)
            .then(response => {
              const { user } = response.data;
              set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
              });
            })
            .catch(() => {
              // Token is invalid, remove it
              get().logout();
            });
        } else {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user info, not the token (token is in httpOnly cookie)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);