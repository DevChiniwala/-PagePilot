/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot?: {
    accept(cb?: (mod: unknown) => void): void;
    accept(path: string, cb: (mod: unknown) => void): void;
    dispose(cb: () => void): void;
  };
}

// Chrome extension types
declare namespace chrome {
  export namespace runtime {
    export interface ManifestBase {
      oauth2?: {
        client_id: string;
        scopes: string[];
      };
    }
  }

  export namespace sidePanel {
    export interface PanelBehavior {
      openPanelOnActionClick?: boolean;
    }
    export function setPanelBehavior(behavior: PanelBehavior): Promise<void>;
    export function open(options: { windowId: number }): Promise<void>;
    export function getOptions(callback?: (options: { enabled: boolean; path?: string }) => void): void;
  }

  export namespace scripting {
    export interface ScriptInjection {
      target: { tabId: number };
      files: string[];
    }
    export function executeScript(injection: ScriptInjection): Promise<void>;
  }

  export namespace identity {
    export function getRedirectURL(path?: string): string;
    export function launchWebAuthFlow(
      options: { url: string; interactive: boolean },
      callback?: (redirectUrl: string) => void
    ): Promise<string>;
  }
}

// Declare __DEV__ global
declare const __DEV__: boolean | undefined;