import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, MOCK_USERS } from '@/lib/mockData';

type EntryRole = "customer" | "merchant";

interface AuthState {
  user: User | null;
  selectedEntryRole: EntryRole | null;
  isAuthenticated: boolean;
  
  // Actions
  setEntryRole: (role: EntryRole) => void;
  login: (phone: string, otp: string) => { success: boolean; error?: string };
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      selectedEntryRole: null,
      isAuthenticated: false,

      setEntryRole: (role) => set({ selectedEntryRole: role }),

      login: (phone, otp) => {
        // Simulate OTP check (always 1234 for demo)
        if (otp !== '1234') {
          return { success: false, error: 'Invalid OTP' };
        }

        // Find user by phone in mock db
        const user = MOCK_USERS.find(u => u.phone === phone);
        
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        const entryRole = get().selectedEntryRole;
        
        // --- LOGIC: Check consistency between Entry Role and Actual Role ---

        if (entryRole === 'merchant') {
          // If trying to enter as Merchant
          if (user.role === 'customer') {
             return { success: false, error: 'This phone is not registered as a merchant/staff. Apply to become a store.' };
          }
          // Allow merchant_owner and merchant_staff
        } else if (entryRole === 'customer') {
           // If trying to enter as Customer
           if (user.role !== 'customer') {
               // Per requirements: "If user selected 'Customer' but phone is merchant/staff → allow login as customer ONLY if we explicitly allow dual-role"
               // Requirement decision: "allow dual-role = YES for now"
               // So we allow it, but we might want to flag it or just treat them as customer in this session
           }
        }

        set({ user, isAuthenticated: true });
        return { success: true };
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, selectedEntryRole: null });
        // Clean up other stores if needed (cart/wishlist is handled separately by localStorage but we should clear sensitive data if real app)
        localStorage.removeItem('cart');
        localStorage.removeItem('favorites');
      }
    }),
    {
      name: 'loom-auth-storage', // unique name
      partialize: (state) => ({ 
          user: state.user, 
          selectedEntryRole: state.selectedEntryRole, 
          isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
