// History Component for PagePilot Side Panel

import React, { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  History as HistoryIcon, Globe, Trash2, ChevronRight,
  Sparkles, MessageSquare, Clock, RefreshCw, Search
} from 'lucide-react';
import { cn, formatDate, getModeLabel } from '../utils/formatting';
import { useStore } from '../store';
import type { Session } from '../types';

export function History() {
  const {
    sessions, sessionsTotal, sessionsHasMore, isLoadingSessions,
    fetchSessions, selectSession, deleteSession, setCurrentView
  } = useStore();

  useEffect(() => {
    if (sessions.length === 0) {
      fetchSessions(1);
    }
  }, []);

  const handleSelect = useCallback(async (session: Session) => {
    try {
      const detail = await import('../store').then(m => m.useStore.getState().selectSession);
      // Fetch full session detail
      const api = await import('../services/api').then(m => m.api);
      const sessionDetail = await api.getSession(session.id);
      selectSession(sessionDetail);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, [selectSession, setCurrentView]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this session?')) {
      await deleteSession(id);
    }
  }, [deleteSession]);

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">History</h2>
          <span className="text-xs text-muted-foreground">({sessionsTotal})</span>
        </div>
        <button
          onClick={() => fetchSessions(1)}
          disabled={isLoadingSessions}
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', isLoadingSessions && 'animate-spin')} />
        </button>
      </div>

      {isLoadingSessions && sessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No History Yet</h3>
            <p className="text-xs text-muted-foreground">
              Analyzed pages will appear here for quick access.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {sessions.map((session, i) => (
            <motion.button
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => handleSelect(session)}
              className="w-full text-left p-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors group"
            >
              <div className="flex items-start gap-3">
                {session.favicon ? (
                  <img src={session.favicon} alt="" className="w-8 h-8 rounded-lg mt-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {session.title || session.url}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{session.url}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                      {getModeLabel(session.mode)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(session.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </motion.button>
          ))}

          {sessionsHasMore && (
            <button
              onClick={() => fetchSessions(sessions.length / 20 + 1)}
              disabled={isLoadingSessions}
              className="w-full py-3 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLoadingSessions ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}