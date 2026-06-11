// TypeScript types for PagePilot Extension

export type Mode = 'fast' | 'deep' | 'eli5' | 'expert';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface Session {
  id: string;
  url: string;
  title?: string;
  favicon?: string;
  mode: Mode;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    citations?: Citation[];
    mode?: Mode;
    tokens?: number;
    userMessageId?: string;
  };
  createdAt: string;
}

export interface Citation {
  chunkId: string;
  text: string;
  metadata?: Record<string, unknown>;
  distance?: number;
}

export interface SummaryCard {
  title: string;
  content: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface SummarizeResponse {
  sessionId: string;
  mode: Mode;
  url: string;
  title?: string;
  cards: SummaryCard[];
  generatedAt: string;
  tokenUsage?: Record<string, number>;
}

export interface Summary {
  id: string;
  sessionId: string;
  mode: Mode;
  content: string;
  createdAt: string;
}

export interface SessionDetail {
  session: Session;
  messages: Message[];
  summaries: Summary[];
}

export interface SummarizeRequest {
  sessionId: string;
  mode: Mode;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  mode: Mode;
  history?: Message[];
}

export interface StreamEvent {
  event: 'start' | 'chunk' | 'citation' | 'done' | 'error';
  data: {
    type?: string;
    delta?: string;
    content?: string;
    citations?: Citation[];
    metadata?: Record<string, unknown>;
    error?: string;
    chunkCount?: number;
    mode?: Mode;
  };
}

export interface CreateSessionRequest {
  url: string;
  mode?: Mode;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
  services: Record<string, string>;
}

// UI State types
export interface UIState {
  sidebarOpen: boolean;
  currentView: 'dashboard' | 'chat' | 'history' | 'settings';
  isLoading: boolean;
  error: string | null;
}

// Extension messaging types
export interface ExtensionMessage {
  type: string;
  [key: string]: unknown;
}

export interface ApiRequestMessage extends ExtensionMessage {
  type: 'API_REQUEST';
  requestId: string;
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponseMessage extends ExtensionMessage {
  type: 'API_RESPONSE';
  requestId: string;
  status: number;
  data?: unknown;
  error?: string;
}

export interface ExtractContentMessage extends ExtensionMessage {
  type: 'EXTRACT_CONTENT';
  url: string;
}

export interface ExtractContentResponseMessage extends ExtensionMessage {
  type: 'EXTRACT_CONTENT_RESPONSE';
  success: boolean;
  data?: ExtractedContent;
  error?: string;
}

export interface ExtractedContent {
  title: string;
  text: string;
  html: string;
  favicon?: string;
  metaDescription?: string;
  headings: Array<{ level: number; text: string; id: string }>;
}

export interface AuthStateMessage extends ExtensionMessage {
  type: 'AUTH_STATE';
  user: User | null;
  accessToken: string | null;
  error?: string;
}

export interface OAuthStartMessage extends ExtensionMessage {
  type: 'OAUTH_START';
}

export interface LogoutMessage extends ExtensionMessage {
  type: 'LOGOUT';
}

export interface GetAuthStateMessage extends ExtensionMessage {
  type: 'GET_AUTH_STATE';
}