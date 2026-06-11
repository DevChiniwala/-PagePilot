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

let authState: { user: User | null; accessToken: string | null } = { user: null, accessToken: null };

// Initialize auth state from storage
chrome.storage.local.get(['pagepilot_auth'], (result) => {
  if (result.pagepilot_auth) {
    authState = result.pagepilot_auth;
  }
});

function saveAuthState() {
  chrome.storage.local.set({ pagepilot_auth: authState });
}

async function handleApiRequest(message: ApiRequest, _sender: chrome.runtime.MessageSender): Promise<void> {
  const { requestId, method, path, body, headers } = message;

  try {
    const url = `${API_BASE_URL}${path}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (authState.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${authState.accessToken}`;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text();

    const apiResponse: ApiResponse = {
      type: 'API_RESPONSE',
      requestId,
      status: response.status,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : (data as string) || `HTTP ${response.status}`,
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

    console.log('[PAGEPILOT] redirectUri', redirectUri);
    console.log('[PAGEPILOT] authUrl', authUrl.toString());
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
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await response.json();
    authState = {
      user: data.user,
      accessToken: data.access_token,
    };
    saveAuthState();

    chrome.runtime.sendMessage({
      type: 'AUTH_STATE',
      user: authState.user,
      accessToken: authState.accessToken,
    });
  } catch (error) {
    console.error('Token exchange failed:', error);
    throw error;
  }
}

async function handleLogout(): Promise<void> {
  authState = { user: null, accessToken: null };
  saveAuthState();
  chrome.runtime.sendMessage({ type: 'AUTH_STATE', user: null, accessToken: null });
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'API_REQUEST':
      handleApiRequest(message, sender);
      return true; // Async response

    case 'EXTRACT_CONTENT':
      handleExtractContent(message);
      return true;

    case 'OAUTH_START':
      handleOAuthStart();
      return true;

    case 'LOGOUT':
      handleLogout();
      return true;

    case 'GET_AUTH_STATE':
      chrome.runtime.sendMessage({ type: 'AUTH_STATE', user: authState.user, accessToken: authState.accessToken });
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