import type {
  User,
  Session,
  SessionListResponse,
  SessionDetail,
  SummarizeRequest,
  ChatRequest,
  StreamEvent,
  CreateSessionRequest,
} from '../types';

// API client routes through the background service worker for proper CORS bypass
class ApiClient {
  private accessToken: string | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  onAuthFailure: (() => void) | null = null;

  constructor() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'API_RESPONSE') {
        const pending = this.pendingRequests.get(message.requestId);
        if (pending) {
          this.pendingRequests.delete(message.requestId);
          if (message.error) {
            if (message.status === 401) {
              this.onAuthFailure?.();
            }
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

  setTokens(accessToken: string | null, _refreshToken: string | null) {
    this.accessToken = accessToken;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(method: string, path: string, body?: unknown, timeoutMs = 120000): Promise<T> {
    const requestId = `${Date.now()}-${++this.requestId}`;
    console.log(`[API] request ${method} ${path} timeout=${timeoutMs}ms`);

    return new Promise((resolve, reject) => {
      if (this.pendingRequests.has(requestId)) {
        this.pendingRequests.delete(requestId);
      }

      this.pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject });

      chrome.runtime.sendMessage({
        type: 'API_REQUEST',
        requestId,
        method,
        path,
        body,
        headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          console.error(`[API] TIMEOUT ${method} ${path} after ${timeoutMs}ms`);
          reject(new Error('Request timeout'));
        }
      }, timeoutMs);
    });
  }

  // Auth
  async googleAuth(code: string): Promise<{ access_token: string; refresh_token: string; user: User }> {
    return this.request('POST', '/auth/google', { code });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('GET', '/auth/me');
  }

  async logout(): Promise<void> {
    await this.request('POST', '/auth/logout');
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
    await this.request('DELETE', `/sessions/${id}`);
  }

  // Streaming via SW
  async consumeStream(
    request: SummarizeRequest | ChatRequest,
    onEvent: (event: StreamEvent) => void
  ): Promise<StreamEvent | null> {
    const isChat = 'message' in request;
    const path = isChat ? '/chat' : '/summarize';
    const requestId = `${Date.now()}-${++this.requestId}`;

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'STREAM_REQUEST',
        requestId,
        method: 'POST',
        path,
        body: request,
        headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
      });

      let resolved = false;
      let lastEvent: StreamEvent | null = null;

      const listener = (message: { type: string; requestId?: string; event?: string; data?: unknown }) => {
        if (message.type === 'STREAM_EVENT' && message.requestId === requestId && message.event && message.data !== undefined) {
          const streamEvent: StreamEvent = {
            event: message.event as StreamEvent['event'],
            data: message.data as StreamEvent['data'],
          };
          onEvent(streamEvent);
          lastEvent = streamEvent;
          if (message.event === 'done' || message.event === 'error') {
            chrome.runtime.onMessage.removeListener(listener);
            if (!resolved) {
              resolved = true;
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
          reject(new Error('Stream timeout'));
        }
      }, 120000);
    });
  }
}

export const api = new ApiClient();
