// API Client for PagePilot Extension
// Communicates with background script which proxies to backend

import type {
  User,
  TokenResponse,
  Session,
  SessionListResponse,
  SessionDetail,
  Message,
  SummarizeRequest,
  SummarizeResponse,
  ChatRequest,
  StreamEvent,
  CreateSessionRequest,
  Mode,
  ApiError,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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

  // Summarize - returns async iterator for streaming
  async *summarize(request: SummarizeRequest): AsyncGenerator<StreamEvent> {
    const requestId = `${Date.now()}-${++this.requestId}`;
    
    return new Promise((resolve, reject) => {
      const events: StreamEvent[] = [];
      let resolved = false;

      const cleanup = () => {
        this.pendingRequests.delete(requestId);
      };

      this.pendingRequests.set(requestId, {
        resolve: (value) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(value);
          }
        },
        reject: (error) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(error);
          }
        },
      });

      chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        requestId,
        method: 'POST',
        path: '/summarize',
        body: request,
        headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
      });

      // Set up listener for streaming events
      const listener = (message: unknown) => {
        const msg = message as StreamEvent;
        if (msg.event && msg.data) {
          events.push(msg);
          
          // Yield events through async generator
          // We'll handle this by resolving with the events array
          if (msg.event === 'done' || msg.event === 'error') {
            cleanup();
            resolve(events);
          }
        }
      };

      chrome.runtime.onMessage.addListener(listener);
      
      // Timeout
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error('Stream timeout'));
        }
      }, 120000);
    }) as Promise<StreamEvent[]>;
  }

  // Chat - returns async iterator for streaming
  async *chat(request: ChatRequest): AsyncGenerator<StreamEvent> {
    const requestId = `${Date.now()}-${++this.requestId}`;
    
    return new Promise((resolve, reject) => {
      const events: StreamEvent[] = [];
      let resolved = false;

      const cleanup = () => {
        this.pendingRequests.delete(requestId);
      };

      this.pendingRequests.set(requestId, {
        resolve: (value) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(value);
          }
        },
        reject: (error) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(error);
          }
        },
      });

      chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        requestId,
        method: 'POST',
        path: '/chat',
        body: request,
        headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
      });

      const listener = (message: unknown) => {
        const msg = message as StreamEvent;
        if (msg.event && msg.data) {
          events.push(msg);
          if (msg.event === 'done' || msg.event === 'error') {
            cleanup();
            resolve(events);
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
    }) as Promise<StreamEvent[]>;
  }

  // Helper to consume streaming events
  async consumeStream(
    request: SummarizeRequest | ChatRequest,
    onEvent: (event: StreamEvent) => void
  ): Promise<StreamEvent | null> {
    const isChat = 'message' in request;
    const stream = isChat ? this.chat(request as ChatRequest) : this.summarize(request as SummarizeRequest);
    
    let lastEvent: StreamEvent | null = null;
    
    for await (const event of stream) {
      onEvent(event);
      lastEvent = event;
      if (event.event === 'done' || event.event === 'error') {
        break;
      }
    }
    
    return lastEvent;
  }
}

export const api = new ApiClient();