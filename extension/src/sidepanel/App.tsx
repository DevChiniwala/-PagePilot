// Main App Component for PagePilot Side Panel

import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Layout, Dashboard, Chat, History, Settings,
  LoginPrompt, LoadingScreen, ErrorToast
} from './components';
import { useStore } from './store';
import { messaging } from './services/messaging';

function App() {
  const {
    isAuthenticated,
    authChecked,
    user,
    checkAuth,
    currentView,
    setCurrentView,
    sidebarOpen,
    toggleSidebar,
    setError,
    extractedContent,
    isExtracting,
  } = useStore();

  // Listen for auth state changes from background
  useEffect(() => {
    const unsubscribe = messaging.onAuthStateChange((authUser, accessToken, authError, refreshToken) => {
      if (authUser && accessToken) {
        useStore.getState().setAuth(authUser, accessToken, refreshToken);
        useStore.getState().fetchSessions(1);
      } else if (authError) {
        setError(authError);
      }
    });
    return unsubscribe;
  }, [setError]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading screen during initial auth check
  if (!authChecked) {
    return <LoadingScreen />;
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return <LoginPrompt onLogin={useStore.getState().loginWithGoogle} />;
  }

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground">
      <ErrorToast />
      
      <AnimatePresence mode="wait">
        <Layout
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          currentView={currentView}
          onViewChange={setCurrentView}
          user={user}
          onLogout={useStore.getState().logout}
        >
          <div className="flex-1 overflow-hidden">
            {currentView === 'dashboard' && (
              <Dashboard
                extractedContent={extractedContent}
                isExtracting={isExtracting}
                onExtract={useStore.getState().extractContent}
                onSummarize={useStore.getState().summarize}
                onChat={useStore.getState().sendMessage}
              />
            )}
            {currentView === 'chat' && (
              <Chat
                messages={useStore.getState().messages}
                isStreaming={useStore.getState().isStreaming}
                onSendMessage={useStore.getState().sendMessage}
                mode={useStore.getState().mode}
                setMode={useStore.getState().setMode}
              />
            )}
            {currentView === 'history' && <History />}
            {currentView === 'settings' && <Settings />}
          </div>
        </Layout>
      </AnimatePresence>
    </div>
  );
}

export { App };