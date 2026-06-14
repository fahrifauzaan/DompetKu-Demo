import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  name: string;
  email: string;
  photoURL: string;
  sheetUrl?: string;
  spreadsheetId?: string;
}

export interface RegisteredUser {
  email: string;
  password: string; // Plaintext for demo representation
  name: string;
  photoURL: string;
  sheetUrl?: string;
  spreadsheetId?: string;
}

interface AuthState {
  user: AuthUser | null;
  registeredUsers: RegisteredUser[];
  login: (email: string, password: string) => { success: boolean; error?: string };
  loginWithGoogle: (email: string) => { success: boolean; error?: string };
  signup: (email: string, password: string, name: string, photoURL?: string, sheetUrl?: string, spreadsheetId?: string) => void;
  updateUserSheetUrl: (email: string, sheetUrl: string) => void;
  updateUserSpreadsheetId: (email: string, spreadsheetId: string) => void;
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
        set({ user: { name: found.name, email: found.email, photoURL: found.photoURL, sheetUrl: found.sheetUrl, spreadsheetId: found.spreadsheetId } });
        
        try {
          import('./useFinanceStore').then(module => {
            if (cleanedEmail === 'demo@dompetku.com') {
              module.useFinanceStore.getState().resetFinance();
            } else {
              if (found.sheetUrl) {
                module.useFinanceStore.getState().setGoogleSheetUrl(found.sheetUrl);
              }
              if (found.spreadsheetId) {
                module.useFinanceStore.getState().setSpreadsheetId(found.spreadsheetId);
              }
            }
            // Trigger sync immediately
            module.useFinanceStore.getState().syncFromGoogleSheets();
          });
        } catch (e) { console.error(e); }
        
        return { success: true };
      },
      loginWithGoogle: (email) => {
        const cleanedEmail = email.trim().toLowerCase();
        const found = get().registeredUsers.find(u => u.email.toLowerCase() === cleanedEmail);
        if (!found) {
          return { success: false, error: 'Email tidak terdaftar' };
        }
        set({ user: { name: found.name, email: found.email, photoURL: found.photoURL, sheetUrl: found.sheetUrl, spreadsheetId: found.spreadsheetId } });
        
        try {
          import('./useFinanceStore').then(module => {
            if (cleanedEmail === 'demo@dompetku.com') {
              module.useFinanceStore.getState().resetFinance();
            } else {
              if (found.sheetUrl) {
                module.useFinanceStore.getState().setGoogleSheetUrl(found.sheetUrl);
              }
              if (found.spreadsheetId) {
                module.useFinanceStore.getState().setSpreadsheetId(found.spreadsheetId);
              }
            }
            module.useFinanceStore.getState().syncFromGoogleSheets();
          });
        } catch (e) { console.error(e); }
        
        return { success: true };
      },
      signup: (email, password, name, photoURL, sheetUrl, spreadsheetId) => {
        const cleanedEmail = email.trim().toLowerCase();
        const defaultPhoto = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
        
        // Find existing to preserve data if not provided
        const existing = get().registeredUsers.find(u => u.email.toLowerCase() === cleanedEmail);
        const resolvedSheetUrl = sheetUrl !== undefined ? sheetUrl : (existing?.sheetUrl || '');
        const resolvedSpreadsheetId = spreadsheetId !== undefined ? spreadsheetId : (existing?.spreadsheetId || '');

        const newUser: RegisteredUser = {
          email: cleanedEmail,
          password,
          name,
          photoURL: defaultPhoto,
          sheetUrl: resolvedSheetUrl,
          spreadsheetId: resolvedSpreadsheetId
        };
        set(state => {
          const exists = state.registeredUsers.some(u => u.email.toLowerCase() === cleanedEmail);
          const updatedUsers = exists
            ? state.registeredUsers.map(u => u.email.toLowerCase() === cleanedEmail ? newUser : u)
            : [...state.registeredUsers, newUser];
          return {
            registeredUsers: updatedUsers,
            user: { name: newUser.name, email: newUser.email, photoURL: newUser.photoURL, sheetUrl: newUser.sheetUrl, spreadsheetId: newUser.spreadsheetId }
          };
        });
        
        try {
          import('./useFinanceStore').then(module => {
            const finStore = module.useFinanceStore.getState();
            const urlChanged = resolvedSheetUrl && finStore.googleSheetUrl !== resolvedSheetUrl;
            const idChanged = resolvedSpreadsheetId && finStore.spreadsheetId !== resolvedSpreadsheetId;
            
            if (urlChanged) {
              finStore.setGoogleSheetUrl(resolvedSheetUrl);
            }
            if (idChanged) {
              finStore.setSpreadsheetId(resolvedSpreadsheetId);
            }
            
            // Only trigger a new sync if the database settings actually changed or if there is no active sync
            if ((urlChanged || idChanged) && !finStore.isSyncing) {
              finStore.syncFromGoogleSheets();
            }
          });
        } catch (e) { console.error(e); }
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
      updateUserSpreadsheetId: (email, spreadsheetId) => {
        const cleanedEmail = email.trim().toLowerCase();
        set(state => {
          const updatedUsers = state.registeredUsers.map(u => 
            u.email.toLowerCase() === cleanedEmail ? { ...u, spreadsheetId } : u
          );
          const updatedUser = state.user && state.user.email.toLowerCase() === cleanedEmail
            ? { ...state.user, spreadsheetId }
            : state.user;
          return {
            registeredUsers: updatedUsers,
            user: updatedUser
          };
        });
      },
      logout: () => {
        set({ user: null });
        try {
          // Dynamic import or require is not strictly needed if we import it at the top,
          // but importing it at the top might cause circular dependency if useFinanceStore imports useAuthStore.
          // Since it's a module, let's just import it inside the function, or import it at the top.
          // Actually, we can just use window / module import dynamically:
          import('./useFinanceStore').then(module => {
            module.useFinanceStore.getState().resetFinance();
          });
        } catch (e) {
          console.error('Failed to reset finance store on logout', e);
        }
      }
    }),
    {
      name: `${import.meta.env.VITE_APP_NAME ? import.meta.env.VITE_APP_NAME.toLowerCase().replace(/\s+/g, '-') : 'dompetku'}-auth-storage`,
      version: 1, // Bump version to clear old demo account cache
    }
  )
);
