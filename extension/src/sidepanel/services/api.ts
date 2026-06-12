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

const API_BASE = 'http://localhost:8000/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  onAuthFailure: (() => void) | null = null;

  setTokens(accessToken: string | null, refreshToken: string | null) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async refreshTokenCall(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.refreshToken}`,
        },
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token || this.refreshToken;
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(method: string, path: string, body?: unknown, retries = 1): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && retries > 0) {
      const refreshed = await this.refreshTokenCall();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryRes = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!retryRes.ok) {
          const errData = await retryRes.json().catch(() => retryRes.text());
          throw new Error(typeof errData === 'string' ? errData : errData.detail || errData.error || `HTTP ${retryRes.status}`);
        }
        return retryRes.json();
      }
      this.onAuthFailure?.();
      throw new Error('Invalid or expired token');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => res.text());
      throw new Error(typeof errData === 'string' ? errData : errData.detail || errData.error || `HTTP ${res.status}`);
    }

    return res.json();
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

  // Streaming via direct fetch + ReadableStream
  async consumeStream(
    request: SummarizeRequest | ChatRequest,
    onEvent: (event: StreamEvent) => void
  ): Promise<StreamEvent | null> {
    const isChat = 'message' in request;
    const path = isChat ? '/chat' : '/summarize';
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      if (res.status === 401) {
        const refreshed = await this.refreshTokenCall();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryRes = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
          });
          if (!retryRes.ok) throw new Error(`Stream request failed: ${retryRes.status}`);
          return this.readStream(retryRes, onEvent);
        }
        throw new Error('Invalid or expired token');
      }
      throw new Error(`Stream request failed: ${res.status}`);
    }

    return this.readStream(res, onEvent);
  }

  private async readStream(res: Response, onEvent: (event: StreamEvent) => void): Promise<StreamEvent | null> {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let lastEvent: StreamEvent | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split('\n');
        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim();
          else if (line.startsWith('data: ')) eventData = line.slice(6).trim();
        }

        if (eventType && eventData) {
          let parsed: unknown = eventData;
          try { parsed = JSON.parse(eventData); } catch { /* use raw string */ }

          const streamEvent: StreamEvent = { event: eventType as StreamEvent['event'], data: parsed };
          onEvent(streamEvent);
          lastEvent = streamEvent;
          if (eventType === 'done' || eventType === 'error') return lastEvent;
        }
      }
    }
    return lastEvent;
  }
}

export const api = new ApiClient();
