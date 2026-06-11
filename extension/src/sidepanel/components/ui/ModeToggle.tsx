// Premium Mode Toggle for PagePilot

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Brain, Lightbulb, Target,
  Sparkles
} from 'lucide-react';
import { cn } from '../../utils/formatting';
import type { Mode } from '../../types';
import { GlassCard } from './GlassCard';

interface ModeToggleProps {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
  className?: string;
  variant?: 'tabs' | 'cards' | 'compact';
}

const modes: Array<{
  id: Mode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
}> = [
  {
    id: 'fast',
    label: 'Fast',
    description: 'TL;DR in bullets',
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    gradient: 'from-blue-500/20 to-blue-600/5',
  },
  {
    id: 'deep',
    label: 'Deep',
    description: 'Full analysis',
    icon: Brain,
    color: 'from-purple-500 to-purple-600',
    gradient: 'from-purple-500/20 to-purple-600/5',
  },
  {
    id: 'eli5',
    label: 'ELI5',
    description: 'Simple analogies',
    icon: Lightbulb,
    color: 'from-green-500 to-green-600',
    gradient: 'from-green-500/20 to-green-600/5',
  },
  {
    id: 'expert',
    label: 'Expert',
    description: 'Technical depth',
    icon: Target,
    color: 'from-orange-500 to-orange-600',
    gradient: 'from-orange-500/20 to-orange-600/5',
  },
];

export function PremiumModeToggle({
  activeMode,
  onModeChange,
  className,
  variant = 'tabs',
}: ModeToggleProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          Analysis Mode
        </span>
      </div>

      {variant === 'tabs' && (
        <div className="flex gap-1 p-1 rounded-2xl bg-muted/50 border border-border/30">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={cn(
                  'relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all z-10',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeModeTab"
                    className={cn('absolute inset-0 rounded-xl bg-gradient-to-br shadow-sm border border-border/50', mode.gradient)}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={cn('h-3.5 w-3.5', isActive && mode.color.split(' ')[0].replace('from-', 'text-'))} />
                  {mode.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid grid-cols-2 gap-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={cn(
                  'group relative p-3 rounded-2xl text-left transition-all border',
                  isActive
                    ? 'bg-gradient-to-br border-primary/30 shadow-md'
                    : 'bg-card/60 backdrop-blur-xl border-border/30 hover:border-muted-foreground/30'
                )}
                style={isActive ? { backgroundImage: `linear-gradient(135deg, ${mode.gradient.includes('from-blue') ? 'rgba(59,130,246,0.1)' : mode.gradient.includes('from-purple') ? 'rgba(168,85,247,0.1)' : mode.gradient.includes('from-green') ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.1)'}, transparent)` } : undefined}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-all',
                  isActive
                    ? 'bg-gradient-to-br shadow-sm'
                    : 'bg-muted group-hover:bg-accent',
                  mode.gradient
                )}>
                  <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground')} />
                </div>
                <p className={cn('text-xs font-medium', isActive ? 'text-foreground' : 'text-foreground/80')}>
                  {mode.label}
                </p>
                <p className={cn('text-[10px] mt-0.5', isActive ? 'text-muted-foreground/80' : 'text-muted-foreground')}>
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {variant === 'compact' && (
        <div className="flex gap-1.5">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
                )}
              >
                <Icon className="h-3 w-3" />
                {mode.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ModeIndicator({ mode, className }: { mode: Mode; className?: string }) {
  const current = modes.find(m => m.id === mode);
  if (!current) return null;

  const Icon = current.icon;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      key={mode}
      className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium', className)}
    >
      <Icon className="h-3 w-3" />
      {current.label}
    </motion.div>
  );
}