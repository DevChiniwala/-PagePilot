// API Client for PagePilot Extension
// Communicates with background script which proxies to backend

import type {
  User,
  TokenResponse,
  Session,
  SessionListResponse,
  SessionDetail,
  SummarizeRequest,
  ChatRequest,
  StreamEvent,
  CreateSessionRequest,
} from '../types';

class ApiClient {
  private accessToken: string | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor() {
    // Listen for responses from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'API_RESPONSE') {
        const pending = this.pendingRequests.get(message.requestId);
        if (pending) {
          this.pendingRequests.delete(message.requestId);
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.data);
          }
        }
      }
      
      if (message.type === 'AUTH_STATE') {
        this.accessToken = message.accessToken;
      }
    });
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const requestId = `${Date.now()}-${++this.requestId}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject });
      
      chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        requestId,
        method,
        path,
        body,
        headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  // Auth
  async googleAuth(code: string): Promise<TokenResponse> {
    return this.request<TokenResponse>('POST', '/auth/google', { code });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('GET', '/auth/me');
  }

  async refreshToken(): Promise<TokenResponse> {
    return this.request<TokenResponse>('POST', '/auth/refresh');
  }

  async logout(): Promise<void> {
    return this.request<void>('POST', '/auth/logout');
  }

  // Sessions
  async getSessions(page = 1, pageSize = 20): Promise<SessionListResponse> {
    return this.request<SessionListResponse>('GET', `/sessions?page=${page}&page_size=${pageSize}`);
  }

  async createSession(data: CreateSessionRequest): Promise<Session> {
    return this.request<Session>('POST', '/sessions', data);
  }

  async getSession(id: string): Promise<SessionDetail> {
    return this.request<SessionDetail>('GET', `/sessions/${id}`);
  }

  async deleteSession(id: string): Promise<void> {
    return this.request<void>('DELETE', `/sessions/${id}`);
  }

  // Summarize - streaming via events array
  private streamRequest(path: string, body: unknown, onEvent: (event: StreamEvent) => void): Promise<StreamEvent | null> {
    const requestId = `${Date.now()}-${++this.requestId}`;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.pendingRequests.delete(requestId);
      };

      chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        requestId,
        method: 'POST',
        path,
        body,
        headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
      });

      let resolved = false;
      let lastEvent: StreamEvent | null = null;

      const listener = (message: unknown) => {
        const msg = message as StreamEvent;
        if (msg.event && msg.data) {
          onEvent(msg);
          lastEvent = msg;
          if (msg.event === 'done' || msg.event === 'error') {
            chrome.runtime.onMessage.removeListener(listener);
            if (!resolved) {
              resolved = true;
              cleanup();
              resolve(lastEvent);
            }
          }
        }
      };

      chrome.runtime.onMessage.addListener(listener);

      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error('Stream timeout'));
        }
      }, 120000);
    });
  }

  // Helper to consume streaming events
  async consumeStream(
    request: SummarizeRequest | ChatRequest,
    onEvent: (event: StreamEvent) => void
  ): Promise<StreamEvent | null> {
    const isChat = 'message' in request;
    return this.streamRequest(
      isChat ? '/chat' : '/summarize',
      request,
      onEvent
    );
  }
}

export const api = new ApiClient();