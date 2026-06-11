// Dashboard Components for PagePilot Side Panel

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Brain, Target, BarChart3, RefreshCw,
  Globe, Zap, Clock, Layers, ChevronDown, ChevronUp,
  MessageSquare, Copy, Share2, Bookmark, Trash2,
  Lightbulb, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { cn, formatDate, getModeLabel, getModeColor } from '../utils/formatting';
import { useStore } from '../store';
import type { Mode, StreamEvent, SummaryCard } from '../types';

interface DashboardProps {
  extractedContent: {
    title: string;
    text: string;
    html: string;
    favicon?: string;
    metaDescription?: string;
    headings: Array<{ level: number; text: string; id: string }>;
  } | null;
  isExtracting: boolean;
  onExtract: (url: string) => Promise<void>;
  onSummarize: (sessionId: string, mode: Mode, onEvent: (event: StreamEvent) => void) => Promise<void>;
  onChat: (sessionId: string, message: string, mode: Mode, onEvent: (event: StreamEvent) => void) => Promise<void>;
}

const MODES: Array<{ id: Mode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: 'fast', label: 'Fast Summary', icon: Zap, description: 'Quick TL;DR in bullets' },
  { id: 'deep', label: 'Deep Analysis', icon: Brain, description: 'Comprehensive breakdown' },
  { id: 'eli5', label: 'Explain Like I\'m 12', icon: Lightbulb, description: 'Simple analogies' },
  { id: 'expert', label: 'Technical Expert', icon: Target, description: 'Preserve all technical details' },
];

export function Dashboard({
  extractedContent,
  isExtracting,
  onExtract,
  onSummarize,
  onChat,
}: DashboardProps) {
  const { currentSession, summary, isSummarizing, mode: activeMode, setMode, setCurrentView, clearCurrentSession } = useStore();
  const [url, setUrl] = useState('');

  const handleExtract = useCallback(async () => {
    if (!url || isExtracting) return;
    clearCurrentSession();
    await onExtract(url);
  }, [url, isExtracting, onExtract, clearCurrentSession]);

  const handleSummarize = useCallback(async () => {
    if (!currentSession) return;
    await onSummarize(currentSession.session.id, activeMode, (event) => {
      if (event.event === 'done' && event.data.cards) {
        // Summary complete - handled by store
      }
    });
  }, [currentSession, activeMode, onSummarize]);

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* URL Input */}
      <UrlInput
        url={url}
        onUrlChange={setUrl}
        onSubmit={handleExtract}
        isExtracting={isExtracting}
      />

      {/* Extracted Page Info */}
      <AnimatePresence>
        {extractedContent && (
          <PageInfo
            content={extractedContent}
            isExtracting={isExtracting}
          />
        )}
      </AnimatePresence>

      {/* Mode Selector */}
      <ModeSelector
        modes={MODES}
        activeMode={activeMode}
        onModeChange={setMode}
      />

      {/* Action Buttons */}
      <AnimatePresence>
        {currentSession && (
          <ActionButtons
            sessionId={currentSession.session.id}
            onSummarize={handleSummarize}
            isSummarizing={isSummarizing}
            onStartChat={() => setCurrentView('chat')}
          />
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      {summary && summary.cards && (
        <SummaryCards cards={summary.cards} />
      )}

      {/* Empty State */}
      {!extractedContent && !isExtracting && !currentSession && (
        <EmptyState />
      )}
    </div>
  );
}

function UrlInput({
  url,
  onUrlChange,
  onSubmit,
  isExtracting,
}: {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  isExtracting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2"
    >
      <div className="flex-1 relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="Paste URL to analyze..."
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-all"
          disabled={isExtracting}
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={!url || isExtracting}
        className={cn(
          'h-10 px-4 rounded-lg text-sm font-medium transition-all shrink-0',
          url && !isExtracting
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isExtracting ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          'Analyze'
        )}
      </button>
    </motion.div>
  );
}

function PageInfo({
  content,
  isExtracting,
}: {
  content: { title: string; favicon?: string; headings: Array<{ level: number; text: string; id: string }> };
  isExtracting: boolean;
}) {
  const [showHeadings, setShowHeadings] = useState(false);
  const topHeadings = content.headings.filter(h => h.level <= 3).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        {content.favicon ? (
          <img src={content.favicon} alt="" className="w-8 h-8 rounded-lg mt-0.5" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{content.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('w-2 h-2 rounded-full', isExtracting ? 'bg-yellow-400 animate-pulse' : 'bg-green-400')} />
          <span className="text-xs text-muted-foreground">{isExtracting ? 'Extracting...' : 'Loaded'}</span>
        </div>
      </div>

      {topHeadings.length > 0 && (
        <div>
          <button
            onClick={() => setShowHeadings(!showHeadings)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            {topHeadings.length} sections
            {showHeadings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <AnimatePresence>
            {showHeadings && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 space-y-1 overflow-hidden"
              >
                {topHeadings.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-5 text-right text-[10px] font-mono opacity-60">H{h.level}</span>
                    <span className="truncate">{h.text}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function ModeSelector({
  modes,
  activeMode,
  onModeChange,
}: {
  modes: Array<{ id: Mode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }>;
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Analysis Mode</label>
      <div className="grid grid-cols-2 gap-2">
        {modes.map(mode => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all',
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-accent'
              )}
            >
              <div className={cn(
                'mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{mode.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{mode.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActionButtons({
  sessionId,
  onSummarize,
  isSummarizing,
  onStartChat,
}: {
  sessionId: string;
  onSummarize: () => Promise<void>;
  isSummarizing: boolean;
  onStartChat: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-2"
    >
      <button
        onClick={onSummarize}
        disabled={isSummarizing}
        className={cn(
          'flex-1 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
          isSummarizing
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
        )}
      >
        {isSummarizing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Summarizing...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Generate Summary
          </>
        )}
      </button>
      <button
        onClick={onStartChat}
        className="h-10 px-4 rounded-lg text-sm font-medium transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    'TL;DR': Sparkles,
    'Key Insights': Lightbulb,
    'Action Items': Target,
    'Overview': Globe,
    'Key Points': Brain,
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</h3>
      {cards.map((card, index) => {
        const Icon = icons[card.title] || Sparkles;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-xl border border-border bg-card p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">{card.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{card.content}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to PagePilot</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Paste a URL above to analyze any webpage. Get AI-powered summaries, insights, and chat with the content.
        </p>
        <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5" />
            <span>Fast summaries in seconds</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" />
            <span>Deep analysis with citations</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Interactive chat with the page</span>
          </div>
        </div>
      </div>
    </div>
  );
}