// Zustand Store for PagePilot Extension Side Panel

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type {
  User,
  Session,
  SessionDetail,
  Message,
  SummarizeResponse,
  Mode,
  StreamEvent,
} from '../types';
import { api } from '../services/api';
import { messaging } from '../services/messaging';

interface AppState {
  // Auth
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  setAuth: (user: User | null, accessToken: string | null, refreshToken?: string | null) => void;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  checkAuth: () => Promise<void>;

  // Sessions
  sessions: Session[];
  sessionsTotal: number;
  sessionsPage: number;
  sessionsHasMore: boolean;
  isLoadingSessions: boolean;
  currentSession: SessionDetail | null;
  isLoadingSession: boolean;
  fetchSessions: (page?: number) => Promise<void>;
  createSession: (url: string, mode?: Mode) => Promise<Session>;
  selectSession: (session: SessionDetail) => void;
  deleteSession: (id: string) => Promise<void>;
  clearCurrentSession: () => void;

  // Summarization
  summary: SummarizeResponse | null;
  isSummarizing: boolean;
  summarize: (sessionId: string, mode: Mode, onEvent: (event: StreamEvent) => void) => Promise<void>;

  // Chat
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (sessionId: string, message: string, mode: Mode, onEvent: (event: StreamEvent) => void) => Promise<void>;
  clearMessages: () => void;

  // UI
  mode: Mode;
  setMode: (mode: Mode) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentView: 'dashboard' | 'chat' | 'history' | 'settings';
  setCurrentView: (view: 'dashboard' | 'chat' | 'history' | 'settings') => void;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;

  // Extracted content
  extractedContent: {
    title: string;
    text: string;
    html: string;
    favicon?: string;
    metaDescription?: string;
    headings: Array<{ level: number; text: string; id: string }>;
  } | null;
  isExtracting: boolean;
  extractContent: (url: string) => Promise<void>;
}

const MODES: Mode[] = ['fast', 'deep', 'eli5', 'expert'];

// localStorage adapter MUST be defined before persist() uses it
const localStorageAdapter: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // quota exceeded or unavailable
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      // unavailable
    }
  },
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      accessToken: null,
      isAuthenticated: false,
      authChecked: false,
      
      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, isAuthenticated: !!user && !!accessToken });
        api.setTokens(accessToken, refreshToken || null);
      },

      logout: async () => {
        try {
          await api.logout();
        } catch (error) {
          console.error('Logout API error:', error);
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
        api.setAccessToken(null);
        messaging.sendLogout();
      },

      loginWithGoogle: () => {
        messaging.sendOAuthStart();
      },

      checkAuth: async () => {
        const { user, accessToken, refreshToken } = await messaging.getAuthState();
        if (user && accessToken) {
          set({ user, accessToken, isAuthenticated: true, authChecked: true });
          api.setTokens(accessToken, refreshToken);
        } else {
          set({ authChecked: true });
        }
      },

      // Sessions
      sessions: [],
      sessionsTotal: 0,
      sessionsPage: 1,
      sessionsHasMore: false,
      isLoadingSessions: false,
      currentSession: null,
      isLoadingSession: false,

      fetchSessions: async (page = 1) => {
        set({ isLoadingSessions: true, error: null });
        try {
          const response = await api.getSessions(page, 20);
          set({
            sessions: page === 1 ? response.sessions : [...get().sessions, ...response.sessions],
            sessionsTotal: response.total,
            sessionsPage: response.page,
            sessionsHasMore: response.hasMore,
            isLoadingSessions: false,
          });
        } catch (error) {
          set({ isLoadingSessions: false, error: error instanceof Error ? error.message : 'Failed to load sessions' });
        }
      },

      createSession: async (url, mode = 'fast') => {
        console.log('[STORE] createSession start', { url, mode });
        set({ isLoading: true, error: null });
        try {
          console.log('[STORE] calling api.createSession...');
          const startTime = Date.now();
          const session = await api.createSession({ url, mode });
          console.log(`[STORE] api.createSession done in ${Date.now() - startTime}ms`, { sessionId: session.id });
          // Fetch full session detail and set as current
          console.log('[STORE] fetching session detail...');
          const detail = await api.getSession(session.id);
          set({ currentSession: detail, messages: detail.messages, isLoading: false });
          // Refresh sessions list
          await get().fetchSessions(1);
          console.log('[STORE] createSession complete');
          return session;
        } catch (error) {
          console.error('[STORE] createSession failed', error);
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to create session' });
          throw error;
        }
      },

      selectSession: async (sessionDetail) => {
        set({ currentSession: sessionDetail, isLoadingSession: false, messages: sessionDetail.messages || [] });
      },

      deleteSession: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await api.deleteSession(id);
          set(state => ({
            sessions: state.sessions.filter(s => s.id !== id),
            currentSession: state.currentSession?.session.id === id ? null : state.currentSession,
            isLoading: false,
          }));
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to delete session' });
        }
      },

      clearCurrentSession: () => {
        set({ currentSession: null, messages: [] });
      },

      // Summarization
      summary: null,
      isSummarizing: false,

      summarize: async (sessionId, mode, onEvent) => {
        set({ isSummarizing: true, summary: null, error: null });
        try {
          await api.consumeStream({ sessionId, mode }, (event) => {
            if (event.event === 'done' && event.data?.summary) {
              const summary = event.data.summary;
              set({
                summary: {
                  sessionId,
                  mode,
                  url: '',
                  cards: summary.cards || summary.sections || [],
                  generatedAt: new Date().toISOString(),
                },
              });
            }
            onEvent(event);
          });
          set({ isSummarizing: false });
        } catch (error) {
          set({ isSummarizing: false, error: error instanceof Error ? error.message : 'Summarization failed' });
          onEvent({ event: 'error', data: { error: error instanceof Error ? error.message : 'Summarization failed' } });
        }
      },

      // Chat
      messages: [],
      isStreaming: false,

      sendMessage: async (sessionId, message, mode, onEvent) => {
        set({ isStreaming: true, error: null });
        const history = get().messages;
        try {
          await api.consumeStream({ sessionId, message, mode, history }, onEvent);
          set({ isStreaming: false });
        } catch (error) {
          set({ isStreaming: false, error: error instanceof Error ? error.message : 'Chat failed' });
          onEvent({ event: 'error', data: { error: error instanceof Error ? error.message : 'Chat failed' } });
        }
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      // UI
      mode: 'fast',
      setMode: (mode) => {
        if (MODES.includes(mode)) {
          set({ mode });
        }
      },

      sidebarOpen: true,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      currentView: 'dashboard',
      setCurrentView: (view) => set({ currentView: view }),

      isLoading: false,
      error: null,
      setError: (error) => set({ error }),

      // Extracted content
      extractedContent: null,
      isExtracting: false,

      extractContent: async (url): Promise<boolean> => {
        set({ isExtracting: true, error: null });
        try {
          const content = await messaging.extractContent(url);
          set({ extractedContent: content, isExtracting: false });
          return true;
        } catch (error) {
          set({ isExtracting: false, error: error instanceof Error ? error.message : 'Content extraction failed' });
          return false;
        }
      },
    }),
    {
      name: 'pagepilot-store',
      storage: createJSONStorage(() => localStorageAdapter),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        mode: state.mode,
        sidebarOpen: state.sidebarOpen,
        currentView: state.currentView,
      }),
    }
  )
);

// Initialize auth on store creation
if (typeof window !== 'undefined') {
  useStore.getState().checkAuth();
}