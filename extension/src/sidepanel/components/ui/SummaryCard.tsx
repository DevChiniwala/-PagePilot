// Premium Summary Card Components for PagePilot

import { useState } from 'react';
import {
  Sparkles, Brain, Target, BarChart3, Lightbulb,
  Globe, Layers, Copy, Check,
  Maximize2, Minimize2
} from 'lucide-react';
import { cn } from '../../utils/formatting';
import { GlassCard, AnimatedCard, FloatingCard } from './GlassCard';
import { ComplexityBadge, ComplexityBar } from './ComplexityScore';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { SummaryCard as SummaryCardType } from '../../types';

interface PremiumSummaryCardProps {
  card: SummaryCardType;
  index: number;
  totalCards?: number;
  modeIcon?: React.ComponentType<{ className?: string }>;
}

const cardIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'TL;DR': Sparkles,
  'Key Insights': Lightbulb,
  'Action Items': Target,
  'Overview': Globe,
  'Key Points': Brain,
  'Implications': Layers,
  'Analysis': BarChart3,
};

export function PremiumSummaryCard({
  card,
  index,
  totalCards,
  modeIcon: _ModeIcon,
}: PremiumSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const Icon = cardIcons[card.title] || Sparkles;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(card.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <AnimatedCard delay={index * 0.1} direction="up">
      <GlassCard variant="elevated" hover className="group">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10'
          )}>
            <Icon className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">{card.title}</h4>
                {totalCards && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {index + 1}/{totalCards}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy card content"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title={expanded ? 'Collapse' : 'Expand'}
                >
                  {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className={cn(
              'text-sm text-muted-foreground leading-relaxed',
              expanded ? '' : 'line-clamp-4'
            )}>
              <MarkdownRenderer content={card.content} animate={false} />
            </div>

            {card.metadata && (
              <div className="flex items-center gap-2 pt-1">
                {typeof card.metadata.complexity === 'number' && (
                  <ComplexityBadge score={card.metadata.complexity} />
                )}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </AnimatedCard>
  );
}

export function SummaryDashboardHeader({
  mode,
  url,
  title,
  favicon,
  complexity,
}: {
  mode: string;
  url: string;
  title?: string;
  favicon?: string;
  complexity?: number;
}) {
  return (
    <FloatingCard className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
          {favicon ? (
            <img src={favicon} alt="" className="w-full h-full object-cover" />
          ) : (
            <Globe className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {title || 'Untitled Page'}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{url}</p>
        </div>
        {complexity !== undefined && (
          <ComplexityBadge score={complexity} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className={cn(
          'px-2.5 py-1 rounded-full text-[10px] font-medium',
          mode === 'fast' && 'bg-blue-500/10 text-blue-400',
          mode === 'deep' && 'bg-purple-500/10 text-purple-400',
          mode === 'eli5' && 'bg-green-500/10 text-green-400',
          mode === 'expert' && 'bg-orange-500/10 text-orange-400',
        )}>
          {mode.toUpperCase()}
        </div>
        {complexity !== undefined && (
          <div className="flex-1">
            <ComplexityBar score={complexity} />
          </div>
        )}
      </div>
    </FloatingCard>
  );
}

export function LoadingSummaryCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 bg-card/60 backdrop-blur-xl border border-border/30 shimmer"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-full bg-muted rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}