// Background Service Worker for PagePilot Chrome Extension (Manifest V3)

interface ApiRequest {
  type: 'API_REQUEST';
  requestId: string;
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiResponse {
  type: 'API_RESPONSE';
  requestId: string;
  status: number;
  data?: unknown;
  error?: string;
}

interface ExtractContentMessage {
  type: 'EXTRACT_CONTENT';
  url: string;
}

interface ExtractContentResponse {
  type: 'EXTRACT_CONTENT_RESPONSE';
  success: boolean;
  data?: {
    title: string;
    text: string;
    html: string;
    favicon?: string;
    metaDescription?: string;
    headings: Array<{ level: number; text: string; id: string }>;
  };
  error?: string;
}

interface OAuthMessage {
  type: 'OAUTH_START' | 'OAUTH_CALLBACK';
  code?: string;
  redirectUri?: string;
}

interface AuthStateMessage {
  type: 'AUTH_STATE';
  user: User | null;
  accessToken: string | null;
}

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

const API_BASE_URL = (() => {
  // In development, use localhost
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'http://localhost:8000/api/v1';
  }
  // In production, use the deployed API
  return 'https://api.pagepilot.ai/api/v1';
})();

let authState: { user: User | null; accessToken: string | null; refreshToken: string | null } = { user: null, accessToken: null, refreshToken: null };
let authLoaded = false;
const authLoadQueue: Array<() => void> = [];

// Initialize auth state from storage (blocking promise)
async function loadAuthState(): Promise<void> {
  const result = await chrome.storage.local.get(['pagepilot_auth']);
  if (result.pagepilot_auth) {
    authState = result.pagepilot_auth;
  }
  authLoaded = true;
  authLoadQueue.forEach(fn => fn());
  authLoadQueue.length = 0;
}

function saveAuthState() {
  chrome.storage.local.set({ pagepilot_auth: authState });
}

function sendAuthState() {
  chrome.runtime.sendMessage({
    type: 'AUTH_STATE',
    user: authState.user,
    accessToken: authState.accessToken,
    refreshToken: authState.refreshToken,
  });
}

function waitForAuth(): Promise<void> {
  if (authLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    authLoadQueue.push(resolve);
    // Safety timeout: don't wait more than 5s for auth state
    setTimeout(() => {
      const idx = authLoadQueue.indexOf(resolve);
      if (idx !== -1) authLoadQueue.splice(idx, 1);
      authLoaded = true;
      resolve();
    }, 5000);
  });
}

// Start loading auth state immediately
loadAuthState().catch((err) => {
  console.error('[SW] Auth state load failed, continuing without auth', err);
  authLoaded = true;
  authLoadQueue.forEach(fn => fn());
  authLoadQueue.length = 0;
});

async function apiFetch(path: string, method: string, body?: unknown, extraHeaders?: Record<string, string>, retry = true): Promise<{ ok: boolean; status: number; data: unknown }> {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[SW:${traceId}] apiFetch start`, { method, path, hasToken: !!authState.accessToken });

  await waitForAuth();
  console.log(`[SW:${traceId}] auth ready, proceeding with fetch`);

  const url = `${API_BASE_URL}${path}`;
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (authState.accessToken) {
    requestHeaders['Authorization'] = `Bearer ${authState.accessToken}`;
  }

  console.log(`[SW:${traceId}] fetching ${method} ${url}`);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    console.log(`[SW:${traceId}] fetch response`, { status: response.status, ok: response.ok });
  } catch (fetchErr) {
    console.error(`[SW:${traceId}] fetch threw`, fetchErr);
    throw fetchErr;
  }

  if (response.status === 401 && retry) {
    console.log(`[SW:${traceId}] got 401, attempting token refresh`);
    const refreshOk = await tryRefreshToken();
    if (refreshOk) {
      console.log(`[SW:${traceId}] token refreshed, retrying request`);
      return apiFetch(path, method, body, extraHeaders, false);
    }
    console.log(`[SW:${traceId}] token refresh failed`);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  console.log(`[SW:${traceId}] response body read`, { contentType, dataType: typeof data, dataLength: typeof data === 'string' ? data.length : JSON.stringify(data).length });
  return { ok: response.ok, status: response.status, data };
}

async function tryRefreshToken(): Promise<boolean> {
  if (!authState.refreshToken) {
    // Can't refresh without a refresh token. Clear auth to force re-login.
    authState = { user: null, accessToken: null, refreshToken: null };
    saveAuthState();
    sendAuthState();
    return false;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authState.refreshToken}`,
      },
    });

    if (!response.ok) {
      authState = { user: null, accessToken: null, refreshToken: null };
      saveAuthState();
      sendAuthState();
      return false;
    }

    const data = await response.json();
    authState = {
      user: data.user || authState.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || authState.refreshToken,
    };
    saveAuthState();
    sendAuthState();
    return true;
  } catch {
    return false;
  }
}

async function handleApiRequest(message: ApiRequest, _sender: chrome.runtime.MessageSender): Promise<void> {
  const { requestId, method, path, body, headers } = message;

  try {
    const result = await apiFetch(path, method, body, headers);
    const apiResponse: ApiResponse = {
      type: 'API_RESPONSE',
      requestId,
      status: result.status,
      data: result.ok ? result.data : undefined,
      error: result.ok ? undefined : formatApiError(result.data, result.status),
    };
    chrome.runtime.sendMessage(apiResponse);
  } catch (error) {
    const apiResponse: ApiResponse = {
      type: 'API_RESPONSE',
      requestId,
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    };
    chrome.runtime.sendMessage(apiResponse);
  }
}

async function handleExtractContent(message: ExtractContentMessage): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

        // Inject content script if not already injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js'],
    }).catch(() => {
      // Script may already be injected; ignore
    });

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT', url: message.url });
    
    chrome.runtime.sendMessage({
      type: 'EXTRACT_CONTENT_RESPONSE',
      success: true,
      data: response,
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      type: 'EXTRACT_CONTENT_RESPONSE',
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
    });
  }
}

async function handleOAuthStart(): Promise<void> {
  try {
    const redirectUri = chrome.identity.getRedirectURL('oauth2');
    const clientId = chrome.runtime.getManifest().oauth2?.client_id;
    console.log('[PAGEPILOT] redirectUri:', redirectUri);
    console.log('[PAGEPILOT] clientId:', clientId);
    
    if (!clientId || clientId === '__GOOGLE_CLIENT_ID__') {
      throw new Error('Google Client ID not configured');
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('[PAGEPILOT] redirectUri', JSON.stringify(redirectUri));
    console.log('[PAGEPILOT] clientId', JSON.stringify(clientId));
    console.log('[PAGEPILOT] authUrl', JSON.stringify(authUrl.toString()));
    let redirectUrl;
    try {
      redirectUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true,
      });
      console.log('[PAGEPILOT] launchWebAuthFlow redirectUrl:', redirectUrl);
    } catch (flowError) {
      console.error('[PAGEPILOT] launchWebAuthFlow threw:', flowError);
      console.error('[PAGEPILOT] flowError instanceof Error:', flowError instanceof Error);
      console.error('[PAGEPILOT] flowError.message:', flowError instanceof Error ? flowError.message : '(not an Error)');
      console.error('[PAGEPILOT] flowError.stack:', flowError instanceof Error ? flowError.stack : '(no stack)');
      if (chrome.runtime.lastError) {
        console.error('[PAGEPILOT] chrome.runtime.lastError:', chrome.runtime.lastError);
      }
      throw flowError;
    }

    if (!redirectUrl) throw new Error('OAuth redirect URL is empty');
    const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');

    if (code) {
      await exchangeCodeForTokens(code);
    }
  } catch (error) {
    console.error('[PAGEPILOT] OAuth failed - error:', error);
    console.error('[PAGEPILOT] OAuth failed - instanceof Error:', error instanceof Error);
    console.error('[PAGEPILOT] OAuth failed - message:', error instanceof Error ? error.message : '(not an Error)');
    console.error('[PAGEPILOT] OAuth failed - stack:', error instanceof Error ? error.stack : '(no stack)');
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE',
      user: null,
      accessToken: null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function exchangeCodeForTokens(code: string): Promise<void> {
  try {
    const url = `${API_BASE_URL}/auth/google`;
    console.log('[PAGEPILOT] Sending token exchange request', { url, codeLength: code.length, apiBaseUrl: API_BASE_URL });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    console.log('[PAGEPILOT] Response status', response.status);
    const responseText = await response.text();
    console.log('[PAGEPILOT] Response body', responseText);

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    authState = {
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
    saveAuthState();

    sendAuthState();
  } catch (error) {
    console.error('[PAGEPILOT] Token exchange fetch failed', error);
    console.error('[PAGEPILOT] error.name:', (error as Error)?.name);
    console.error('[PAGEPILOT] error.message:', (error as Error)?.message);
    throw error;
  }
}

async function handleLogout(): Promise<void> {
  authState = { user: null, accessToken: null, refreshToken: null };
  saveAuthState();
  sendAuthState();
}

function formatApiError(data: unknown, status: number): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    return (obj.detail as string) || (obj.message as string) || (obj.error as string) || `HTTP ${status}`;
  }
  return `HTTP ${status}`;
}

async function handleStreamRequest(message: {
  type: 'STREAM_REQUEST';
  requestId: string;
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<void> {
  const { requestId, method, path, body, headers } = message;

  try {
    const result = await apiFetch(path, method, body, headers);

    if (!result.ok) {
      chrome.runtime.sendMessage({
        type: 'STREAM_EVENT',
        requestId,
        event: 'error',
        data: { error: formatApiError(result.data, result.status) },
      });
      return;
    }

    // For non-SSE responses, return as done event
    if (typeof result.data === 'object' || typeof result.data === 'string') {
      chrome.runtime.sendMessage({
        type: 'STREAM_EVENT',
        requestId,
        event: 'done',
        data: result.data,
      });
      return;
    }

    // For SSE responses, read the stream from a new request
    await waitForAuth();
    const url = `${API_BASE_URL}${path}`;
    const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
    if (authState.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${authState.accessToken}`;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      chrome.runtime.sendMessage({
        type: 'STREAM_EVENT',
        requestId,
        event: 'error',
        data: { error: `HTTP ${response.status}` },
      });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      chrome.runtime.sendMessage({
        type: 'STREAM_EVENT',
        requestId,
        event: 'error',
        data: { error: 'No response body' },
      });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

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

          chrome.runtime.sendMessage({
            type: 'STREAM_EVENT',
            requestId,
            event: eventType,
            data: parsed,
          });

          if (eventType === 'done' || eventType === 'error') return;
        }
      }
    }
  } catch (error) {
    chrome.runtime.sendMessage({
      type: 'STREAM_EVENT',
      requestId,
      event: 'error',
      data: { error: error instanceof Error ? error.message : 'Stream failed' },
    });
  }
}

// Message listener - must return true + call sendResponse() to keep SW alive
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'API_REQUEST':
      handleApiRequest(message, _sender).finally(() => sendResponse());
      return true;

    case 'STREAM_REQUEST':
      handleStreamRequest(message).finally(() => sendResponse());
      return true;

    case 'EXTRACT_CONTENT':
      handleExtractContent(message).finally(() => sendResponse());
      return true;

    case 'OAUTH_START':
      handleOAuthStart().finally(() => sendResponse());
      return true;

    case 'LOGOUT':
      handleLogout().finally(() => sendResponse());
      return true;

    case 'GET_AUTH_STATE':
    sendAuthState();
      sendResponse();
      break;
  }
});

// Handle side panel opened
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }).catch(() => {});
  }
});