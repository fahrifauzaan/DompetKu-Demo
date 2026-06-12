import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  name: string;
  email: string;
  photoURL: string;
  sheetUrl?: string;
}

export interface RegisteredUser {
  email: string;
  password: string; // Plaintext for demo representation
  name: string;
  photoURL: string;
  sheetUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  registeredUsers: RegisteredUser[];
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (email: string, password: string, name: string, photoURL?: string, sheetUrl?: string) => void;
  updateUserSheetUrl: (email: string, sheetUrl: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      registeredUsers: [
        {
          email: 'demo@dompetku.com',
          password: 'password123',
          name: 'Demo Admin',
          photoURL: 'https://ui-avatars.com/api/?name=Demo+Admin&background=0D8ABC&color=fff'
          // sheetUrl deliberately omitted so they see the warning banner
        }
      ],
      login: (email, password) => {
        const cleanedEmail = email.trim().toLowerCase();
        const found = get().registeredUsers.find(u => u.email.toLowerCase() === cleanedEmail);
        if (!found) {
          return { success: false, error: 'Email tidak terdaftar' };
        }
        if (found.password !== password) {
          return { success: false, error: 'Password salah' };
        }
        set({ user: { name: found.name, email: found.email, photoURL: found.photoURL, sheetUrl: found.sheetUrl } });
        return { success: true };
      },
      signup: (email, password, name, photoURL, sheetUrl) => {
        const cleanedEmail = email.trim().toLowerCase();
        const defaultPhoto = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
        
        // Find existing to preserve sheetUrl if not provided
        const existing = get().registeredUsers.find(u => u.email.toLowerCase() === cleanedEmail);
        const resolvedSheetUrl = sheetUrl !== undefined ? sheetUrl : (existing?.sheetUrl || '');

        const newUser: RegisteredUser = {
          email: cleanedEmail,
          password,
          name,
          photoURL: defaultPhoto,
          sheetUrl: resolvedSheetUrl
        };
        set(state => {
          const exists = state.registeredUsers.some(u => u.email.toLowerCase() === cleanedEmail);
          const updatedUsers = exists
            ? state.registeredUsers.map(u => u.email.toLowerCase() === cleanedEmail ? newUser : u)
            : [...state.registeredUsers, newUser];
          return {
            registeredUsers: updatedUsers,
            user: { name: newUser.name, email: newUser.email, photoURL: newUser.photoURL, sheetUrl: newUser.sheetUrl }
          };
        });
      },
      updateUserSheetUrl: (email, sheetUrl) => {
        const cleanedEmail = email.trim().toLowerCase();
        set(state => {
          const updatedUsers = state.registeredUsers.map(u => 
            u.email.toLowerCase() === cleanedEmail ? { ...u, sheetUrl } : u
          );
          const updatedUser = state.user && state.user.email.toLowerCase() === cleanedEmail
            ? { ...state.user, sheetUrl }
            : state.user;
          return {
            registeredUsers: updatedUsers,
            user: updatedUser
          };
        });
      },
      logout: () => {
        set({ user: null });
      }
    }),
    {
      name: `${import.meta.env.VITE_APP_NAME ? import.meta.env.VITE_APP_NAME.toLowerCase().replace(/\s+/g, '-') : 'dompetku'}-auth-storage`,
      version: 1, // Bump version to clear old demo account cache
    }
  )
);
