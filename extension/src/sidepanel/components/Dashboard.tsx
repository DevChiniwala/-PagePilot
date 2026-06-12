// Dashboard Components for PagePilot Side Panel

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Brain, RefreshCw,
  Globe, Zap, Layers, ChevronDown, ChevronUp,
  MessageSquare
} from 'lucide-react';
import { cn } from '../utils/formatting';
import { useStore } from '../store';
import {
  GlassCard, AnimatedCard, FloatingCard,
  PremiumSummaryCard, SummaryDashboardHeader, LoadingSummaryCards,
  PremiumModeToggle,
  IconButton
} from './ui';
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
  onExtract: (url: string) => Promise<boolean>;
  onSummarize: (sessionId: string, mode: Mode, onEvent: (event: StreamEvent) => void) => Promise<void>;
  onChat?: (sessionId: string, message: string, mode: Mode, onEvent: (event: StreamEvent) => void) => Promise<void>;
}

export function Dashboard({
  extractedContent,
  isExtracting,
  onExtract,
  onSummarize,
}: DashboardProps) {
  const { currentSession, summary, isSummarizing, mode: activeMode, setMode, setCurrentView, clearCurrentSession } = useStore();
  const [url, setUrl] = useState('');
  const [showHeadings, setShowHeadings] = useState(false);

  const handleExtract = useCallback(async () => {
    if (!url || isExtracting) return;
    console.log('[Dashboard] Analyze clicked', { url, activeMode });
    clearCurrentSession();
    const success = await onExtract(url);
    console.log('[Dashboard] Extraction result', { success });
    if (success) {
      try {
        console.log('[Dashboard] Starting createSession...');
        const session = await useStore.getState().createSession(url, activeMode);
        if (session) {
          console.log('[Dashboard] Session created, starting summarize...', { sessionId: session.id });
          useStore.getState().summarize(session.id, activeMode, () => {});
        }
      } catch (err) {
        console.error('[Dashboard] Session creation/summarize failed:', err);
      }
    }
  }, [url, isExtracting, activeMode, onExtract, clearCurrentSession]);

  const handleSummarize = useCallback(async () => {
    if (!currentSession) return;
    await onSummarize(currentSession.session.id, activeMode, () => {});
  }, [currentSession, activeMode, onSummarize]);

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* URL Input */}
      <AnimatedCard direction="down">
        <GlassCard variant="elevated" padding="md">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                placeholder="Paste URL to analyze..."
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-background border border-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-shadow"
                disabled={isExtracting}
              />
            </div>
            <IconButton
              onClick={handleExtract}
              disabled={!url || isExtracting}
              variant={url && !isExtracting ? 'primary' : 'default'}
            >
              {isExtracting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze
                </>
              )}
            </IconButton>
          </div>
        </GlassCard>
      </AnimatedCard>

      {/* Premium Mode Toggle */}
      <AnimatedCard direction="up" delay={0.1}>
        <GlassCard variant="default" padding="md">
          <PremiumModeToggle
            activeMode={activeMode}
            onModeChange={setMode}
            variant="tabs"
          />
        </GlassCard>
      </AnimatedCard>

      {/* Extracted Page Info */}
      <AnimatePresence>
        {extractedContent && (
          <AnimatedCard direction="up" delay={0.2}>
            <GlassCard variant="elevated" padding="md" hover>
              <div className="flex items-start gap-3">
                {extractedContent.favicon ? (
                  <img src={extractedContent.favicon} alt="" className="w-10 h-10 rounded-xl mt-0.5" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground truncate">
                      {extractedContent.title || 'Untitled Page'}
                    </h2>
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      isExtracting ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                    )} />
                  </div>
                </div>
              </div>

              {extractedContent.headings.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowHeadings(!showHeadings)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{extractedContent.headings.length} sections</span>
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
                        {extractedContent.headings.map((h, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-5 text-right text-[10px] font-mono opacity-60 shrink-0">
                              H{h.level}
                            </span>
                            <span className="truncate">{h.text}</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </GlassCard>
          </AnimatedCard>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <AnimatePresence>
        {currentSession && (
          <AnimatedCard direction="up" delay={0.3}>
            <div className="flex gap-2">
              <IconButton
                onClick={handleSummarize}
                disabled={isSummarizing}
                variant="primary"
                className="flex-1"
              >
                {isSummarizing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate Summary
                  </>
                )}
              </IconButton>
              <IconButton
                onClick={() => setCurrentView('chat')}
                variant="default"
              >
                <MessageSquare className="h-4 w-4" />
              </IconButton>
            </div>
          </AnimatedCard>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      {summary && summary.cards && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground uppercase tracking-wider">Summary</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {summary.cards.length} cards
            </span>
          </div>

          <SummaryDashboardHeader
            mode={summary.mode}
            url={summary.url}
            title={summary.title}
          />

          {summary.cards.map((card: SummaryCard, index: number) => (
            <PremiumSummaryCard
              key={index}
              card={card}
              index={index}
              totalCards={summary.cards.length}
            />
          ))}
        </div>
      )}

      {/* Loading state */}
      {isSummarizing && !summary && (
        <LoadingSummaryCards count={3} />
      )}

      {/* Empty State */}
      {!extractedContent && !isExtracting && !currentSession && !summary && (
        <div className="flex-1 flex items-center justify-center">
          <FloatingCard className="p-6 text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to PagePilot</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Paste a URL above to analyze any webpage. Get AI-powered summaries, insights, and chat with the content.
            </p>
            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
              {[
                { icon: Zap, text: 'Fast summaries in seconds' },
                { icon: Brain, text: 'Deep analysis with citations' },
                { icon: MessageSquare, text: 'Interactive chat with the page' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span>{item.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </FloatingCard>
        </div>
      )}
    </div>
  );
}