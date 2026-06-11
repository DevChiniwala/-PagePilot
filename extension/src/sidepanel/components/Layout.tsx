// Layout Components for PagePilot Side Panel

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, History, Settings, LogOut, ChevronLeft, ChevronRight,
  User, Sparkles
} from 'lucide-react';
import { cn } from '../utils/formatting';

interface LayoutProps {
  children: React.ReactNode;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  currentView: 'dashboard' | 'chat' | 'history' | 'settings';
  onViewChange: (view: 'dashboard' | 'chat' | 'history' | 'settings') => void;
  user: { name?: string; email: string; avatarUrl?: string } | null;
  onLogout: () => Promise<void>;
}

export function Layout({
  children,
  sidebarOpen,
  onToggleSidebar,
  currentView,
  onViewChange,
  user,
  onLogout,
}: LayoutProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '⌘1' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, shortcut: '⌘2' },
    { id: 'history', label: 'History', icon: History, shortcut: '⌘3' },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: '⌘4' },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <Header user={user} onLogout={onLogout} onToggleSidebar={onToggleSidebar} sidebarOpen={sidebarOpen} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-shrink-0 bg-card border-r border-border flex flex-col overflow-hidden"
            >
              <SidebarNav
                items={navItems}
                currentView={currentView}
                onViewChange={onViewChange}
              />
              <SidebarFooter user={user} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function Header({
  user,
  onLogout,
  onToggleSidebar,
  sidebarOpen,
}: {
  user: { name?: string; email: string; avatarUrl?: string } | null;
  onLogout: () => Promise<void>;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  return (
    <header className="h-14 px-4 bg-card border-b border-border flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold text-lg text-foreground">PagePilot</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm text-foreground max-w-[150px] truncate">{user.name || user.email}</span>
          </div>
        )}
        <button
          onClick={onLogout}
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function SidebarNav({
  items,
  currentView,
  onViewChange,
}: {
  items: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }>; shortcut: string }>;
  currentView: string;
  onViewChange: (view: 'dashboard' | 'chat' | 'history' | 'settings') => void;
}) {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as 'dashboard' | 'chat' | 'history' | 'settings')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">{item.label}</span>
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60 bg-muted rounded">
              {item.shortcut}
            </kbd>
          </button>
        );
      })}
    </nav>
  );
}

function SidebarFooter({
  user,
}: {
  user: { name?: string; email: string; avatarUrl?: string } | null;
}) {
  return (
    <div className="p-3 border-t border-border">
      <div className="flex items-center gap-3 px-2 py-2">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
    </div>
  );
}