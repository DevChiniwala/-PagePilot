// Zustand Store for PagePilot Extension Side Panel

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  User,
  Session,
  SessionListResponse,
  SessionDetail,
  Message,
  SummarizeResponse,
  SummaryCard,
  Mode,
  StreamEvent,
  Citation,
} from '../types';
import { api } from '../services/api';
import { messaging } from '../services/messaging';

interface AppState {
  // Auth
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User | null, accessToken: string | null) => void;
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

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      accessToken: null,
      isAuthenticated: false,
      
      setAuth: (user, accessToken) => {
        set({ user, accessToken, isAuthenticated: !!user && !!accessToken });
        if (accessToken) {
          api.setAccessToken(accessToken);
        }
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
        const { user, accessToken } = await messaging.getAuthState();
        if (user && accessToken) {
          set({ user, accessToken, isAuthenticated: true });
          api.setAccessToken(accessToken);
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
        set({ isLoading: true, error: null });
        try {
          const session = await api.createSession({ url, mode });
          // Refresh sessions list
          await get().fetchSessions(1);
          set({ isLoading: false });
          return session;
        } catch (error) {
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
        set({ isSummarizing: true, error: null });
        try {
          await api.consumeStream({ sessionId, mode }, onEvent);
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

      extractContent: async (url) => {
        set({ isExtracting: true, error: null });
        try {
          const content = await messaging.extractContent(url);
          set({ extractedContent: content, isExtracting: false });
        } catch (error) {
          set({ isExtracting: false, error: error instanceof Error ? error.message : 'Content extraction failed' });
        }
      },
    }),
    {
      name: 'pagepilot-store',
      storage: createJSONStorage(() => chrome.storage.local),
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