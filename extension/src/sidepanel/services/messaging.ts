// Messaging utilities for PagePilot Extension
// Handles communication between side panel, background, and content scripts

import type {
  ExtensionMessage,
  ApiRequestMessage,
  ApiResponseMessage,
  ExtractContentMessage,
  ExtractContentResponseMessage,
  AuthStateMessage,
  OAuthStartMessage,
  LogoutMessage,
  GetAuthStateMessage,
  ExtractedContent,
  User,
} from '../types';

type MessageHandler = (message: ExtensionMessage) => void;

class MessagingService {
  private handlers = new Map<string, Set<MessageHandler>>();
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      const handlers = this.handlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error(`[Messaging] Handler error for ${message.type}:`, error);
          }
        });
      }
    });
  }

  on<K extends ExtensionMessage['type']>(type: K, handler: (message: Extract<ExtensionMessage, { type: K }>) => void): () => void {
    this.init();
    
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    
    this.handlers.get(type)!.add(handler as MessageHandler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler as MessageHandler);
    };
  }

  off<K extends ExtensionMessage['type']>(type: K, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  send(message: ExtensionMessage): void {
    chrome.runtime.sendMessage(message);
  }

  // Convenience methods for common message types
  
  // Auth
  onAuthStateChange(handler: (user: User | null, accessToken: string | null, error?: string) => void): () => void {
    return this.on('AUTH_STATE', (message: AuthStateMessage) => {
      handler(message.user, message.accessToken, message.error);
    });
  }

  sendOAuthStart(): void {
    this.send({ type: 'OAUTH_START' });
  }

  sendLogout(): void {
    this.send({ type: 'LOGOUT' });
  }

  async getAuthState(): Promise<{ user: User | null; accessToken: string | null }> {
    return new Promise((resolve) => {
      const unsubscribe = this.on('AUTH_STATE', (message: AuthStateMessage) => {
        unsubscribe();
        resolve({ user: message.user, accessToken: message.accessToken });
      });
      this.send({ type: 'GET_AUTH_STATE' });
      
      // Fallback timeout
      setTimeout(() => {
        unsubscribe();
        resolve({ user: null, accessToken: null });
      }, 1000);
    });
  }

  // Content extraction
  onContentExtracted(handler: (content: ExtractedContent | null, error?: string) => void): () => void {
    return this.on('EXTRACT_CONTENT_RESPONSE', (message: ExtractContentResponseMessage) => {
      handler(message.success ? message.data! : null, message.error);
    });
  }

  async extractContent(url: string): Promise<ExtractedContent> {
    return new Promise((resolve, reject) => {
      const unsubscribe = this.on('EXTRACT_CONTENT_RESPONSE', (message: ExtractContentResponseMessage) => {
        unsubscribe();
        if (message.success) {
          resolve(message.data!);
        } else {
          reject(new Error(message.error || 'Extraction failed'));
        }
      });
      
      this.send({ type: 'EXTRACT_CONTENT', url });
      
      // Timeout
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Extraction timeout'));
      }, 30000);
    });
  }

  // API request/response (handled by api.ts, but exposed for completeness)
  onApiResponse(handler: (requestId: string, data: unknown, error?: string) => void): () => void {
    return this.on('API_RESPONSE', (message: ApiResponseMessage) => {
      handler(message.requestId, message.data!, message.error);
    });
  }
}

export const messaging = new MessagingService();